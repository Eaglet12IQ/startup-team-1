"""Единая точка чтения конфигурации сервиса.

Все переменные окружения читаются только здесь. Остальной код импортирует
готовые константы из этого модуля.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Каталог с макетами (git-репозиторий; volume в docker-compose.yml)
SCHEMAS_DIR = Path(os.getenv("SCHEMAS_DIR", "schemas"))

# Каталог загруженных изображений (volume в docker-compose.yml)
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "uploads"))

# Файл с текущей отображаемой страницей (читается Chromium на Pi)
DISPLAY_FILE = Path(os.getenv("DISPLAY_FILE", "/opt/pidisplay/display.html"))
