#!/bin/sh

# Fix git dubious ownership in Docker
git config --global --add safe.directory /app/schemas

# Запускаем FastAPI
echo "Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${SERVICE_PORT}
