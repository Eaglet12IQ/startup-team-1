import asyncio
import json
import os
import uuid
from datetime import datetime

import redis.asyncio as redis
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from typing import Annotated, Sequence, TypedDict, Literal
import operator

from openai import AsyncOpenAI
from transformers import AutoTokenizer
from functools import partial
# from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

# ====================== КОНФИГУРАЦИЯ ======================
redis_host = os.getenv("REDIS_HOST")     
redis_port = os.getenv("REDIS_PORT")

REDIS_URL = f"redis://{redis_host}:{redis_port}"

MAIN_SYSTEM_PROMPT = os.getenv("MAIN_SYSTEM_PROMPT")
LLM_URL = os.getenv("LLM_URL")
MODEL_NAME = os.getenv("MODEL_NAME")
LLM_API_KEY = os.getenv("LLM_API_KEY")

# MCP_SERVERS_CONFIG = {
#     "system": {"url": os.getenv("MCP_SYSTEM_URL"), "transport": "streamable_http"},
#     "obsidian": {"url": os.getenv("MCP_OBSIDIAN_URL"), "transport": "streamable_http"},
#     "web_search": {"url": os.getenv("MCP_WEB_SEARCH_URL"), "transport": "streamable_http"}
# }

# ====================== LLM КЛИЕНТ ======================
llm_client = AsyncOpenAI(base_url=LLM_URL, api_key=LLM_API_KEY, timeout=120.0)

# ====================== ПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======================
def try_deep_parse(data):
    if isinstance(data, str):
        s = data.strip()
        if (s.startswith('{') and s.endswith('}')) or (s.startswith('[') and s.endswith(']')):
            try:
                return try_deep_parse(json.loads(s))
            except:
                return data
        return data
    elif isinstance(data, dict):
        return {k: try_deep_parse(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [try_deep_parse(i) for i in data]
    return data


def count_tokens(messages: list) -> int:
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-32B-Instruct", trust_remote_code=True)
    total_tokens = 0
    for msg in messages:
        content = getattr(msg, 'content', None)
        if not content:
            continue
        if isinstance(content, str):
            total_tokens += len(tokenizer.encode(content, add_special_tokens=False))
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    total_tokens += len(tokenizer.encode(part.get("text", ""), add_special_tokens=False))
        total_tokens += 4
    total_tokens += 80
    return total_tokens


def langchain_to_openai_messages(langchain_msgs):
    result = []
    for msg in langchain_msgs:
        if isinstance(msg, SystemMessage):
            result.append({"role": "system", "content": msg.content})
        elif isinstance(msg, HumanMessage):
            result.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            openai_msg = {"role": "assistant", "content": msg.content or ""}
            if msg.tool_calls:
                openai_tool_calls = []
                for tc in msg.tool_calls:
                    openai_tool_calls.append({
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": json.dumps(tc.get("args", {}))}
                    })
                openai_msg["tool_calls"] = openai_tool_calls
            result.append(openai_msg)
        elif isinstance(msg, ToolMessage):
            result.append({
                "role": "tool",
                "content": msg.content,
                "tool_call_id": msg.tool_call_id,
            })
        else:
            result.append({"role": "user", "content": str(msg)})
    return result


async def call_llm(messages, tools=None):
    current_tokens = count_tokens(messages)
    MAX_CONTEXT = 32000
    RESERVE_TOKENS = 4000
    available = MAX_CONTEXT - current_tokens - RESERVE_TOKENS
    max_tokens = max(512, min(available, 2048))

    kwargs = {"tools": tools, "tool_choice": "auto"} if tools else {}

    response = await llm_client.chat.completions.create(
        model=MODEL_NAME,
        messages=langchain_to_openai_messages(messages),
        temperature=0.7,
        max_tokens=max_tokens,
        stream=True,
        top_p=0.9,
        presence_penalty=0.1,
        frequency_penalty=0.1,              # ← важно против повторений
        **kwargs,
        extra_body={"lmstudio": {"contextOverflowPolicy": "stopAtLimit"}}
    )
    return response


# ====================== LANGGRAPH ======================
class AgentState(TypedDict):
    messages: Annotated[Sequence, operator.add]
    iteration_count: int
    max_iterations: int
    langchain_tools: list


async def llm_node(state: AgentState, redis_client, stream_key: str):
    messages_for_llm = list(state["messages"])

    # Напоминание
    for i in range(len(messages_for_llm) - 1, -1, -1):
        if isinstance(messages_for_llm[i], HumanMessage):
            messages_for_llm[i] = HumanMessage(
                # content=messages_for_llm[i].content + "\n\n(Важное напоминание: действуй строго по алгоритму из системного промпта!)"
                content=messages_for_llm[i].content
            )
            break

    tools = state.get("langchain_tools", [])

    accumulated_content = ""
    accumulated_reasoning = ""

    stream = await call_llm(messages_for_llm, tools=tools)

    async for chunk in stream:
        delta = chunk.choices[0].delta

        # Reasoning
        reasoning = getattr(delta, "reasoning_content", "") or getattr(delta, "reasoning", "")
        if reasoning:
            await redis_client.xadd(stream_key, {
                "type": "reasoning",
                "content": reasoning,
                "is_done": "false"
            })
            accumulated_reasoning += reasoning

        # Content
        content = getattr(delta, "content", "") or ""
        if content:
            await redis_client.xadd(stream_key, {
                "type": "content",
                "content": content,
                "is_done": "false"
            })
            accumulated_content += content

    # Финальное AI сообщение
    ai_message = AIMessage(content=accumulated_content)
    return {"messages": [ai_message], "iteration_count": state.get("iteration_count", 0) + 1}


async def tool_node(state: AgentState, redis_client, stream_key: str):
    """Tool node с отправкой вызова и результата в Redis Stream"""
    messages = state["messages"]
    last_ai_message = messages[-1]

    if not hasattr(last_ai_message, "tool_calls") or not last_ai_message.tool_calls:
        return {"messages": []}

    tool_results = []

    for tool_call in last_ai_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", tool_call.get("arguments", {}))
        tool_call_id = tool_call["id"]

        # 1. Отправляем информацию о начале вызова инструмента
        await redis_client.xadd(stream_key, {
            "type": "tool_call_start",
            "tool_name": tool_name,
            "tool_args": json.dumps(try_deep_parse(tool_args), ensure_ascii=False),
            "is_done": "false"
        })

        try:
            tools = state.get("langchain_tools", [])
            tool = next((t for t in tools if t.name == tool_name), None)

            if not tool:
                raise ValueError(f"Tool {tool_name} not found")

            result = await tool.ainvoke(tool_args)
            clean_result = try_deep_parse(result)

            result_str = json.dumps(clean_result, ensure_ascii=False, indent=2)

            # 2. Отправляем результат инструмента
            await redis_client.xadd(stream_key, {
                "type": "tool_result",
                "tool_name": tool_name,
                "tool_args": json.dumps(try_deep_parse(tool_args), ensure_ascii=False),
                "content": result_str,
                "is_done": "false"
            })

            tool_results.append(
                ToolMessage(content=result_str, tool_call_id=tool_call_id, name=tool_name)
            )

        except Exception as e:
            error_str = json.dumps({"error": str(e)}, ensure_ascii=False)
            await redis_client.xadd(stream_key, {
                "type": "tool_result",
                "tool_name": tool_name,
                "content": error_str,
                "is_done": "false"
            })
            tool_results.append(
                ToolMessage(content=error_str, tool_call_id=tool_call_id, name=tool_name)
            )

    return {"messages": tool_results}


def should_continue(state: AgentState) -> Literal["tools", "llm", "end"]:
    messages = state["messages"]
    last_message = messages[-1]
    iteration_count = state.get("iteration_count", 0)

    if iteration_count >= 10:
        return "end"
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    content = getattr(last_message, "content", "")
    if not content or content.strip() == "":
        return "llm"
    return "end"


def create_agent_graph(redis_client, stream_key: str, langchain_tools: list):
    graph = StateGraph(AgentState)
    
    # Используем partial, чтобы передать дополнительные аргументы
    llm_node_partial = partial(llm_node, redis_client=redis_client, stream_key=stream_key)
    tool_node_partial = partial(tool_node, redis_client=redis_client, stream_key=stream_key)

    graph.add_node("llm", llm_node_partial)
    graph.add_node("tools", tool_node_partial)

    graph.set_entry_point("llm")
    
    graph.add_conditional_edges(
        "llm",
        should_continue,
        {"tools": "tools", "llm": "llm", "end": END}
    )
    graph.add_edge("tools", "llm")

    return graph.compile()


# ====================== REDIS WORKER ======================
async def llm_worker():
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    stream_name = "llm:generate_requests"
    group_name = "llm-workers"
    consumer_name = f"worker-{uuid.uuid4().hex[:8]}"

    try:
        await redis_client.xgroup_create(stream_name, group_name, "$", mkstream=True)
    except:
        pass

    print(f"🚀 LLM Worker запущен → {consumer_name}")

    # Загрузка MCP инструментов
    mcp_tools = []
    # try:
    #     for name, config in MCP_SERVERS_CONFIG.items():
    #         client = MultiServerMCPClient({name: config})
    #         tools = await client.get_tools()
    #         mcp_tools.extend(tools)
    #         print(f"✓ Загружено {len(tools)} инструментов из {name}")
    # except Exception as e:
    #     print(f"⚠️ Ошибка загрузки MCP: {e}")

    while True:
        try:
            messages = await redis_client.xreadgroup(
                groupname=group_name,
                consumername=consumer_name,
                streams={stream_name: ">"},
                count=1,
                block=5000
            )

            for _, entries in messages:
                for entry_id, fields in entries:
                    try:
                        chat_id = int(fields["chat_id"])
                        run_id = fields["run_id"]
                        
                        messages_raw = fields.get("messages", "[]")
                        if isinstance(messages_raw, str):
                            try:
                                history = json.loads(messages_raw)
                            except json.JSONDecodeError as e:
                                print(f"Не удалось распарсить messages: {e}")
                                history = []
                        else:
                            history = messages_raw

                        output_stream_key = f"chat:{chat_id}:run:{run_id}"
                        print(f"📥 Получена задача → chat={chat_id}, run={run_id}, сообщений={len(history)}")

                        # Конвертируем историю
                        langchain_messages = []
                        for m in history:
                            role = m.get("role")
                            content = m.get("content", "")
                            if role == "system":
                                langchain_messages.append(SystemMessage(content=content))
                            elif role == "user":
                                langchain_messages.append(HumanMessage(content=content))
                            elif role == "assistant":
                                langchain_messages.append(AIMessage(content=content))

                        # Создаём граф
                        graph = create_agent_graph(
                            redis_client=redis_client,
                            stream_key=output_stream_key,
                            langchain_tools=mcp_tools
                        )

                        initial_state = {
                            "messages": langchain_messages,
                            "iteration_count": 0,
                            "max_iterations": 10,
                            "langchain_tools": mcp_tools,
                        }

                        config = {"configurable": {"thread_id": f"chat_{chat_id}"}}

                        # Запускаем граф
                        async for event in graph.astream(initial_state, config=config):
                            pass

                        # Финальное сообщение
                        await redis_client.xadd(output_stream_key, {
                            "type": "done",
                            "content": "",
                            "is_done": "true",
                            "run_id": run_id
                        })

                        await redis_client.xack(stream_name, group_name, entry_id)

                    except Exception as e:
                        print(f"Ошибка обработки задачи {run_id}: {e}")
                        await redis_client.xack(stream_name, group_name, entry_id)

        except Exception as e:
            print(f"❌ Worker error: {e}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(llm_worker())