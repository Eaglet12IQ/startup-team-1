#!/bin/sh

# Применяем миграции
echo "Applying Alembic migrations..."
alembic upgrade head

# Запускаем FastAPI
echo "Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8083
