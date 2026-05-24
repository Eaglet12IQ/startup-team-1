#!/bin/sh

# Запускаем FastAPI
echo "Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${SERVICE_PORT}
