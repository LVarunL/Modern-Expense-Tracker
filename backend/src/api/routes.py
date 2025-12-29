"""API route definitions."""

from fastapi import APIRouter

from src.api.v1.routes import router as v1_router

router = APIRouter()
router.include_router(v1_router, prefix="/v1")
