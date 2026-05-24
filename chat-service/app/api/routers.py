from fastapi import APIRouter
from app.api.endpoints import web_socket

api_router = APIRouter()

api_router.include_router(web_socket.router, tags=["chat"])