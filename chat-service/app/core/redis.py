import logging
import redis.asyncio as redis
from redis.asyncio.client import Redis
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI

# Настройка логгера
logger = logging.getLogger(__name__)

# Глобальный клиент Redis (singleton)
redis_client: Optional[Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Запуск при старте приложения
    await init_redis()
    logger.info("🚀 Приложение запущено")
    yield
    # Выполняется при выключении
    await close_redis()
    logger.info("🛑 Приложение остановлено")


import os

async def init_redis() -> Redis:
    """Инициализация Redis при старте приложения"""
    global redis_client
    
    # Получаем хост Redis из переменной окружения (удобно для dev и prod)
    redis_host = os.getenv("REDIS_HOST")     
    redis_port = os.getenv("REDIS_PORT")
    
    redis_url = f"redis://{redis_host}:{redis_port}"
    
    logger.info(f"Подключение к Redis по адресу: {redis_url}")

    redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        encoding="utf-8",
        socket_connect_timeout=10,
        socket_keepalive=True,
        health_check_interval=30,
    )
    
    try:
        await redis_client.ping()
        logger.info("✅ Redis успешно подключён")
    except Exception as e:
        logger.error(f"❌ Не удалось подключиться к Redis: {e}", exc_info=True)
        raise
    
    return redis_client


async def close_redis():
    """Закрытие соединения при выключении приложения"""
    global redis_client
    if redis_client:
        try:
            await redis_client.close()
            logger.info("Redis соединение закрыто")
        except Exception as e:
            logger.warning(f"Ошибка при закрытии Redis: {e}")


def get_redis() -> Redis:
    """Получить клиент Redis (для Depends)"""
    if redis_client is None:
        raise RuntimeError("Redis не инициализирован. Вызовите init_redis() при старте приложения.")
    return redis_client