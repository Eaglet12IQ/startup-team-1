import logging
import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Annotated

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

    # Добавляем текущее сообщение пользователя в history
    history.append({
        "role": "user",
        "content": user_message,
        "timestamp": datetime.utcnow().isoformat(),
        "run_id": run_id
    })

    # Сохраняем сообщение пользователя и пустое сообщение ассистента в БД
    await add_message_to_db(db, chat_id, role="user", content=user_message, run_id=run_id)
    await add_message_to_db(db, chat_id, role="assistant", content="", run_id=run_id)

    # Отправляем задачу
    await publish_llm_task(chat_id, run_id, history)

    # Запускаем стриминг
    output_stream_key = f"chat:{chat_id}:run:{run_id}"
    asyncio.create_task(stream_from_redis_to_websocket(websocket, output_stream_key, chat_id, db, run_id))


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
    run_id: str
):
    redis = get_redis()
    last_id = "$"

    accumulated_content = ""   # для обновления финального сообщения в БД

    logger.info(f"Начало стриминга для run_id={run_id}")

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
                    is_done = fields.get("is_done") == "true"

                    logger.info(f"Событие: {event_type}, контент: {len(content)} символов, is_done: {is_done}")

                    # Отправляем событие клиенту
                    await websocket.send_json({
                        "type": event_type or "token",
                        "content": content,
                        "tool_name": fields.get("tool_name"),
                        "tool_args": fields.get("tool_args"),
                        "run_id": fields.get("run_id"),
                        "chunk_id": entry_id,
                        "is_done": is_done
                    })

                    # Накопление основного контента
                    if event_type == "content":
                        accumulated_content += content

                    # Обработка завершения
                    if is_done:
                        logger.info(f"Генерация завершена для run_id={run_id}, итоговый контент: {len(accumulated_content)} символов")
                        await websocket.send_json({"type": "done", "run_id": run_id})

                        # Обновляем финальное сообщение ассистента в БД
                        if accumulated_content.strip():
                            await update_assistant_message_in_db(
                                db, chat_id, accumulated_content, run_id
                            )
                        return

                    last_id = entry_id

        except asyncio.TimeoutError:
            continue
        except Exception as e:
            logger.error(f"Stream reading error: {e}", exc_info=True)
            await asyncio.sleep(1)


async def update_assistant_message_in_db(db: Session, chat_id: int, final_content: str, run_id: str):
    """Обновляет последнее сообщение ассистента полным текстом"""
    try:
        chat = db.get(Chats, chat_id)
        if chat and chat.messages:
            # Находим последнее сообщение ассистента с этим run_id
            found = False
            for msg in reversed(chat.messages):
                if msg.get("run_id") == run_id and msg.get("role") == "assistant":
                    msg["content"] = final_content
                    msg["timestamp"] = datetime.utcnow().isoformat()
                    found = True
                    logger.info(f"Обновлено сообщение для run_id={run_id}, контент: {len(final_content)} символов")
                    break

            if not found:
                logger.warning(f"Сообщение с run_id={run_id} не найдено в истории")

            db.commit()
            db.refresh(chat)
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка обновления сообщения в БД: {e}", exc_info=True)


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