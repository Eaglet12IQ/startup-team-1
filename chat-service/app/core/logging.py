import logging
import sys

def setup_logging(level: str = "DEBUG"):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.DEBUG),  # по умолчанию DEBUG
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),                    # вывод в консоль
            # logging.FileHandler("app.log", encoding="utf-8"),   # раскомментируй при необходимости
        ],
        force=True   # важно! переопределяет предыдущие настройки
    )

    # Делаем тише системные логгеры, чтобы не было спама
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully with level: %s", level)