"""Application entry point and app factory."""

from fastapi import FastAPI

from src.api.routes import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Expense Tracker API", version="0.1.0")
    app.include_router(api_router)
    return app


app = create_app()
