from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import api_router
from app.core.git import get_repo

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_repo()
    print("FastAPI + Git repo ready")
    yield
    print("Application shutting down")

app = FastAPI(
    title="constructor-service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
