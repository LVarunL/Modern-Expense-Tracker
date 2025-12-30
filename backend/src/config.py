"""Application configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str
    environment: str
    default_user_id: str


@lru_cache
def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    environment = os.getenv("ENVIRONMENT", "development")
    default_user_id = os.getenv("DEFAULT_USER_ID", "demo-user")
    return Settings(
        database_url=database_url,
        environment=environment,
        default_user_id=default_user_id,
    )
