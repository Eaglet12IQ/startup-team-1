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

# Предзагружаем токенизатор для избежания скачивания на рантайме
RUN python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('Qwen/Qwen2.5-32B-Instruct', trust_remote_code=True)"

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]