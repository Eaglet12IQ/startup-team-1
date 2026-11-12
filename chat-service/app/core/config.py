"""Единая точка чтения конфигурации сервиса.

Все переменные окружения читаются только здесь. Остальной код импортирует
готовые константы из этого модуля. Критичные переменные проверяются на старте:
приложение падает с понятной ошибкой вместо тихого `redis://None:None`.
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


# PostgreSQL (в docker-compose.yml прокидываются из CHAT_POSTGRES_*)
POSTGRES_HOST = _require("POSTGRES_HOST")
POSTGRES_PORT = _require("POSTGRES_PORT")
POSTGRES_USER = _require("POSTGRES_USER")
POSTGRES_PASSWORD = _require("POSTGRES_PASSWORD")
POSTGRES_DB = _require("POSTGRES_DB")

# Redis (дефолты — для локального запуска без docker)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
