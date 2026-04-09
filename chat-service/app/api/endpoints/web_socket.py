import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Annotated
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.chats import Chats
from datetime import datetime

# Настройка логгера (лучше делать в main.py или отдельном конфиге)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/chat/{chat_id}")
async def chat_websocket(
    websocket: WebSocket,
    chat_id: int,
    x_user_id: Annotated[int | None, Query(alias="X-User-ID")] = None,
    db: Session = Depends(get_db),
):
    # === 1. Проверка наличия заголовка ===
    if not x_user_id:
        logger.warning("WebSocket connection rejected: Missing X-User-ID")
        await websocket.close(code=4001, reason="Missing X-User-ID header")
        return

    # === 2. Проверка соответствия chat_id и x_user_id ===
    if chat_id != x_user_id:
        logger.warning(
            f"Access denied: chat_id={chat_id} does not match x_user_id={x_user_id}"
        )
        await websocket.close(
            code=4002,
            reason="Chat ID does not match X-User-ID header. Access denied."
        )
        return

    # Принимаем соединение
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
                logger.warning(f"Unknown message type received from user {x_user_id}: {message.get('type')}")
                await websocket.send_json({
                    "type": "error",
                    "detail": "Unknown message type"
                })

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: user={x_user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {x_user_id}: {e}", exc_info=True)


async def send_full_chat_history(
    websocket: WebSocket,
    chat_id: int,
    db: Session
):
    """Загружает историю сообщений из PostgreSQL и отправляет клиенту"""
    try:
        chat = db.get(Chats, chat_id)
        messages = chat.messages if chat and chat.messages else []

        await websocket.send_json({
            "type": "chat_history",
            "chat_id": chat_id,
            "messages": messages
        })

        logger.info(f"Sent chat history to user {chat_id}: {len(messages)} messages")

    except Exception as e:
        logger.error(f"Error sending chat history for user {chat_id}: {e}", exc_info=True)
        # Отправляем пустую историю, чтобы клиент не завис
        await websocket.send_json({
            "type": "chat_history",
            "chat_id": chat_id,
            "messages": []
        })


async def handle_user_message(
    websocket: WebSocket,
    chat_id: int,
    message: dict,
    db: Session
):
    """Обрабатывает новое сообщение от пользователя"""
    try:
        content = message.get("content")
        if not content or not isinstance(content, str):
            await websocket.send_json({
                "type": "error",
                "detail": "Message content is required"
            })
            logger.warning(f"Invalid message content from user {chat_id}")
            return

        await add_message_to_db(db, chat_id, role="user", content=content)
        
        # Здесь позже будет вызов LLM
        # await start_llm_generation(websocket, chat_id, content, db)

        logger.info(f"User {chat_id} sent message: {content[:100]}{'...' if len(content) > 100 else ''}")

    except Exception as e:
        logger.error(f"Error handling user message for user {chat_id}: {e}", exc_info=True)
        await websocket.send_json({
            "type": "error",
            "detail": "Failed to process message"
        })


async def add_message_to_db(
    db: Session,
    user_id: int,
    role: str,
    content: str,
    run_id: str = None
):
    """Добавляет сообщение в базу данных"""
    try:
        chat = db.get(Chats, user_id)

        if not chat:
            chat = Chats(user_id=user_id, messages=[])
            db.add(chat)
            db.flush()  # важно для async

        new_message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "run_id": run_id
        }

        # 🔥 ВАЖНО: создаём новый список
        current_messages = chat.messages or []
        chat.messages = current_messages + [new_message]

        db.commit()
        db.refresh(chat)

        logger.debug(f"Message added to DB for user {user_id} | role={role} | content={content[:80]}...")

    except Exception as e:
        logger.error(f"Failed to add message to DB for user {user_id}: {e}", exc_info=True)
        raise  # важно пробросить ошибку наверх

async def handle_clear_history(
    websocket: WebSocket,
    chat_id: int,
    db: Session
):
    """Полностью очищает историю чата"""
    try:
        chat = db.get(Chats, chat_id)
        if chat:
            chat.messages = []
            db.commit()
            db.refresh(chat)
            logger.info(f"Chat history cleared for user {chat_id}")
        else:
            await websocket.send_json({
                "type": "error",
                "detail": "Chat not found"
            })
            logger.warning(f"Attempt to clear non-existent chat {chat_id}")

    except Exception as e:
        logger.error(f"Error clearing history for user {chat_id}: {e}", exc_info=True)
        await websocket.send_json({
            "type": "error",
            "detail": "Failed to clear chat history"
        })