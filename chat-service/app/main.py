from fastapi import FastAPI
from app.api.routers import api_router
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title="chat-service"
)

app.include_router(api_router)