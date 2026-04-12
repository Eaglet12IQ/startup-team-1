from fastapi import APIRouter
from app.api.endpoints import schemas_integration
from app.api.endpoints import display

api_router = APIRouter()

api_router.include_router(schemas_integration.router, tags=["schemas_integration"])
api_router.include_router(display.router, prefix="/display", tags=["display"])