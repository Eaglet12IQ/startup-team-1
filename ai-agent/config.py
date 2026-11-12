"""Единая точка чтения конфигурации воркера.

Все переменные окружения читаются только здесь. main.py импортирует
готовые константы из этого модуля. Критичные переменные проверяются на
старте: воркер падает с понятной ошибкой вместо тихого `redis://None:None`.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"Отсутствует обязательная переменная окружения: {name}. "
            f"Задайте её в .env / docker-compose.yml."
        )
    return value


# Redis (дефолты — для локального запуска без docker)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}"

# LLM (LM Studio / OpenAI-совместимый API)
MAIN_SYSTEM_PROMPT = _require("MAIN_SYSTEM_PROMPT")
LLM_URL = _require("LLM_URL")
MODEL_NAME = _require("MODEL_NAME")
LLM_API_KEY = _require("LLM_API_KEY")
