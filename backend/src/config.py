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
    llm_api_key: str | None
    llm_base_url: str
    llm_model: str
    llm_timeout_seconds: float
    llm_temperature: float
    parser_version: str
    llm_provider: str
    parser_timezone: str


@lru_cache
def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    environment = os.getenv("ENVIRONMENT", "development")
    default_user_id = os.getenv("DEFAULT_USER_ID", "demo-user")
    llm_provider = os.getenv("LLM_PROVIDER", "openai").lower()
    llm_api_key = os.getenv("LLM_API_KEY")
    llm_base_url = os.getenv("LLM_BASE_URL")
    if not llm_base_url:
        llm_base_url = (
            "https://api.openai.com"
            if llm_provider == "openai"
            else "https://generativelanguage.googleapis.com"
        )
    llm_model = os.getenv("LLM_MODEL")
    if not llm_model:
        llm_model = "gpt-4o-mini" if llm_provider == "openai" else "gemini-1.5-flash"
    llm_timeout_seconds = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    llm_temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    parser_version = os.getenv("PARSER_VERSION", "poc-v1")
    parser_timezone = os.getenv("PARSER_TIMEZONE", "Asia/Kolkata")
    return Settings(
        database_url=database_url,
        environment=environment,
        default_user_id=default_user_id,
        llm_api_key=llm_api_key,
        llm_base_url=llm_base_url,
        llm_model=llm_model,
        llm_timeout_seconds=llm_timeout_seconds,
        llm_temperature=llm_temperature,
        parser_version=parser_version,
        llm_provider=llm_provider,
        parser_timezone=parser_timezone,
    )
