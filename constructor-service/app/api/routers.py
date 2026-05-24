from fastapi import APIRouter
from app.api.endpoints import schemas_integration
from app.api.endpoints import display
from app.api.endpoints import upload

api_router = APIRouter()

api_router.include_router(display.router, prefix="/display", tags=["display"])
api_router.include_router(schemas_integration.router, tags=["schemas_integration"])
api_router.include_router(upload.router, tags=["upload"])
