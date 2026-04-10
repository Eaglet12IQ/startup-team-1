from fastapi import FastAPI
from app.api.routers import api_router
from app.core.logging import setup_logging
from app.core.redis import lifespan

setup_logging()

app = FastAPI(
    title="chat-service",
    lifespan=lifespan
)

app.include_router(api_router)