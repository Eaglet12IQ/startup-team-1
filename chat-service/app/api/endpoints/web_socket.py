import logging
import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Annotated, List, Dict, Any

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chats import Chats
from app.core.redis import get_redis

import json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat/{chat_id}")
async def chat_websocket(
    websocket: WebSocket,
    chat_id: int,
    x_user_id: Annotated[int | None, Query(alias="X-User-ID")] = None,
    db: Session = Depends(get_db),
):
    if not x_user_id or chat_id != x_user_id:
        await websocket.close(code=4001 if not x_user_id else 4002, reason="Invalid X-User-ID")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected → user={x_user_id}, chat={chat_id}")

    try:
        await send_full_chat_history(websocket, chat_id, db)

        while True:
            message = await websocket.receive_json()

            if message.get("type") == "user_message":
                await handle_user_message(websocket, chat_id, message, db)
            elif message.get("type") == "clear_history":
                await handle_clear_history(websocket, chat_id, db)
            else:
                await websocket.send_json({"type": "error", "detail": "Unknown message type"})

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: user={x_user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)


# ====================== ОБРАБОТКА СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЯ ======================
async def handle_user_message(
    websocket: WebSocket,
    chat_id: int,
    message: dict,
    db: Session
):
    content = message.get("content")
    if not content or not isinstance(content, str):
        await websocket.send_json({"type": "error", "detail": "Message content is required"})
        return

    # Запускаем генерацию через LLM Worker (сохранение сообщения пользователя происходит внутри)
    await start_llm_generation(websocket, chat_id, content, db)


async def start_llm_generation(
    websocket: WebSocket,
    chat_id: int,
    user_message: str,
    db: Session
):
    run_id = str(uuid.uuid4())

    # Получаем историю
    chat = db.get(Chats, chat_id)
    history = chat.messages if chat and chat.messages else []

    # Сохраняем сообщение пользователя с run_id в БД
    await add_message_to_db(db, chat_id, role="user", content=user_message, run_id=run_id)

    # Добавляем в историю для LLM (Worker получит полный контекст)
    history.append({
        "role": "user",
        "content": user_message,
        "timestamp": datetime.utcnow().isoformat(),
        "run_id": run_id
    })

    # Временно сохраняем пустое сообщение ассистента (будет заменено позже)
    await add_message_to_db(db, chat_id, role="assistant", content="", run_id=run_id)

    # Отправляем задачу
    await publish_llm_task(chat_id, run_id, history)

    # Запускаем стриминг, передавая run_messages для накопления
    output_stream_key = f"chat:{chat_id}:run:{run_id}"
    run_messages: List[Dict[str, Any]] = []
    asyncio.create_task(
        stream_from_redis_to_websocket(websocket, output_stream_key, chat_id, db, run_id, run_messages)
    )


async def publish_llm_task(chat_id: int, run_id: str, full_history: list):
    """Отправляем задачу в LLM Worker (с правильной сериализацией)"""
    redis = get_redis()

    task = {
        "type": "generate",
        "chat_id": str(chat_id),
        "run_id": run_id,
        "messages": json.dumps(full_history, ensure_ascii=False),   # ← Вот главное исправление
        "timestamp": datetime.utcnow().isoformat()
    }

    await redis.xadd(
        "llm:generate_requests",
        task,
        maxlen=10000,
        approximate=True
    )

    logger.info(f"Задача отправлена в LLM Worker → run_id={run_id} | сообщений={len(full_history)}")


# ====================== СТРИМИНГ ИЗ REDIS ======================
async def stream_from_redis_to_websocket(
    websocket: WebSocket,
    stream_key: str,
    chat_id: int,
    db: Session,
    run_id: str,
    run_messages: List[Dict[str, Any]]
):
    redis = get_redis()
    last_id = "$"
    accumulated_content = ""
    sequence = 0  # глобальный счётчик порядка событий

    # Данные для формирования AIMessage с tool_calls
    tool_calls_info: List[Dict] = []
    assistant_tool_calls_added = False
    pending_tool_calls: Dict[int, Dict] = {}
    tool_call_timestamps: Dict[int, str] = {}
    content_sequence = -1

    while True:
        try:
            messages = await redis.xread(
                streams={stream_key: last_id},
                count=50,
                block=3000
            )

            if not messages:
                continue

            for _, entries in messages:
                for entry_id, fields in entries:
                    event_type = fields.get("type")
                    content = fields.get("content", "")
                    tool_name = fields.get("tool_name")
                    tool_args = fields.get("tool_args")
                    is_done = fields.get("is_done") == "true"

                    # --- Обработка вызова инструмента (начало) ---
                    if event_type == "tool_call_start":
                        parsed_args = {}
                        if tool_args:
                            try:
                                parsed_args = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                            except:
                                parsed_args = {}

                        tool_call_id = fields.get("tool_call_id")
                        if not tool_call_id:
                            tool_call_id = f"call_{len(tool_calls_info) + 1}"

                        tool_calls_info.append({
                            "id": tool_call_id,
                            "name": tool_name,
                            "args": parsed_args,
                            "sequence": sequence
                        })
                        tool_call_timestamps[len(tool_calls_info) - 1] = datetime.utcnow().isoformat()
                        sequence += 1

                        await websocket.send_json({
                            "type": "tool_call_start",
                            "tool_name": tool_name,
                            "tool_args": tool_args,
                            "tool_call_id": tool_call_id,
                            "run_id": run_id,
                            "chunk_id": entry_id,
                        })

                    # --- Обработка обновления аргументов инструмента ---
                    elif event_type == "tool_call_args":
                        if tool_calls_info:
                            parsed_args = {}
                            if tool_args:
                                try:
                                    parsed_args = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                                except:
                                    parsed_args = {}
                            tool_calls_info[-1]["args"] = parsed_args

                            await websocket.send_json({
                                "type": "tool_call_args",
                                "tool_name": tool_name,
                                "tool_args": tool_args,
                                "run_id": run_id,
                                "chunk_id": entry_id,
                            })

                    # --- Обработка результата инструмента ---
                    elif event_type == "tool_result":
                        tool_call_id = fields.get("tool_call_id")
                        if not tool_call_id and tool_calls_info:
                            tool_call_id = tool_calls_info[-1]["id"]

                        tool_message = {
                            "role": "tool",
                            "content": content,
                            "tool_call_id": tool_call_id,
                            "name": tool_name,
                            "run_id": run_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        run_messages.append(tool_message)

                        await websocket.send_json({
                            "type": "tool_result",
                            "tool_name": tool_name,
                            "tool_call_id": tool_call_id,
                            "content": content,
                            "run_id": run_id,
                            "chunk_id": entry_id,
                        })

                    # --- Обработка токенов контента ---
                    elif event_type == "content":
                        if not accumulated_content and content_sequence == -1:
                            content_sequence = sequence
                        accumulated_content += content

                        await websocket.send_json({
                            "type": "content",
                            "content": content,
                            "run_id": run_id,
                            "chunk_id": entry_id,
                        })

                    # --- Обработка мыслей (reasoning) ---
                    elif event_type == "reasoning":
                        await websocket.send_json({
                            "type": "reasoning",
                            "content": content,
                            "run_id": run_id,
                            "chunk_id": entry_id,
                        })

                    # --- Завершение генерации ---
                    if is_done:
                        if tool_calls_info and not assistant_tool_calls_added:
                            assistant_tool_calls_msg = {
                                "role": "assistant",
                                "content": accumulated_content,
                                "tool_calls": tool_calls_info,
                                "content_sequence": content_sequence,
                                "run_id": run_id,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            run_messages.insert(0, assistant_tool_calls_msg)
                            assistant_tool_calls_added = True
                        else:
                            assistant_final_msg = {
                                "role": "assistant",
                                "content": accumulated_content,
                                "tool_calls": tool_calls_info if tool_calls_info else None,
                                "content_sequence": content_sequence,
                                "run_id": run_id,
                                "timestamp": datetime.utcnow().isoformat()
                            }

                            if assistant_tool_calls_added:
                                for i, msg in enumerate(run_messages):
                                    if msg.get("role") == "assistant" and msg.get("tool_calls"):
                                        run_messages[i] = assistant_final_msg
                                        break
                            else:
                                run_messages.append(assistant_final_msg)

                        await websocket.send_json({"type": "done", "run_id": run_id})

                        # Сохраняем всю цепочку run_messages в БД
                        await save_run_messages_to_db(db, chat_id, run_id, run_messages, tool_call_timestamps)
                        return

                    last_id = entry_id

        except asyncio.TimeoutError:
            continue
        except Exception as e:
            logger.error(f"Stream reading error: {e}", exc_info=True)
            await asyncio.sleep(1)


async def save_run_messages_to_db(
    db: Session,
    chat_id: int,
    run_id: str,
    run_messages: List[Dict[str, Any]],
    tool_call_timestamps: Dict[int, str] = None
):
    """Заменяет временные сообщения с run_id на полную цепочку run_messages."""
    try:
        chat = db.get(Chats, chat_id)
        if not chat:
            return

        # Сохраняем user сообщение с этим run_id ДО фильтрации
        user_msg = next((msg for msg in (chat.messages or []) if msg.get("run_id") == run_id and msg.get("role") == "user"), None)

        # Фильтруем старые сообщения: удаляем все с данным run_id
        filtered_history = [
            msg for msg in (chat.messages or [])
            if msg.get("run_id") != run_id
        ]

        # Добавляем сохранённое user сообщение
        if user_msg:
            filtered_history.append(user_msg)

        # Добавляем остальные сообщения run_messages (assistant + tool)
        order = 0
        for msg in run_messages:
            msg["order"] = order
            order += 1
        filtered_history.extend(run_messages)

        # Сортируем: сначала по timestamp (для разных runs), потом по order (для сообщений одного run)
        def sort_key(msg):
            msg_ts = msg.get("timestamp", "")
            msg_order = msg.get("order", 999999)
            return (msg_ts, msg_order)

        filtered_history.sort(key=sort_key)

        chat.messages = filtered_history
        db.commit()
        db.refresh(chat)
        logger.info(f"История чата {chat_id} обновлена, run_id={run_id}, добавлено сообщений: {len(filtered_history)}")
    except Exception as e:
        logger.error(f"Ошибка сохранения run_messages: {e}")
        db.rollback()


# ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (оставляем как было) ======================
async def send_full_chat_history(websocket: WebSocket, chat_id: int, db: Session):
    try:
        chat = db.get(Chats, chat_id)
        messages = chat.messages if chat and chat.messages else []

        # Фильтруем сообщения: убираем assistant сообщения с пустым content
        filtered_messages = [
            msg for msg in messages
            if msg.get('role') != 'assistant' or (msg.get('role') == 'assistant' and msg.get('content') and msg.get('content').strip())
        ]

        await websocket.send_json({
            "type": "chat_history",
            "chat_id": chat_id,
            "messages": filtered_messages
        })
    except Exception as e:
        logger.error(f"Error sending history: {e}")
        await websocket.send_json({"type": "chat_history", "chat_id": chat_id, "messages": []})


async def add_message_to_db(db: Session, user_id: int, role: str, content: str, run_id: str = None):
    try:
        chat = db.get(Chats, user_id)
        if not chat:
            chat = Chats(user_id=user_id, messages=[])
            db.add(chat)
            db.flush()

        new_message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "run_id": run_id
        }

        chat.messages = (chat.messages or []) + [new_message]
        db.commit()
        db.refresh(chat)
    except Exception as e:
        logger.error(f"Failed to add message to DB: {e}")
        raise


async def handle_clear_history(websocket: WebSocket, chat_id: int, db: Session):
    try:
        chat = db.get(Chats, chat_id)
        if chat:
            chat.messages = []
            db.commit()
            await websocket.send_json({"type": "history_cleared"})
    except Exception as e:
        logger.error(f"Error clearing history: {e}")