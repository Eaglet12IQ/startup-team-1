# ==================== Dockerfile для LLM Worker ====================
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Создаём директорию для возможных кэшей (tokenizer и т.д.)
RUN mkdir -p /root/.cache/huggingface

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]