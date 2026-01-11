"""Application configuration."""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str
    environment: str
    default_user_id: uuid.UUID
    llm_api_key: str | None
    llm_base_url: str
    llm_model: str
    llm_timeout_seconds: float
    llm_temperature: float
    parser_version: str
    llm_provider: str
    cors_allow_origins: list[str]
    auth_required: bool
    jwt_secret: str
    jwt_issuer: str
    jwt_audience: str
    access_token_minutes: int
    refresh_token_days: int
    google_client_ids: list[str]


@lru_cache
def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    environment = os.getenv("ENVIRONMENT", "development")
    default_user_id_env = os.getenv("DEFAULT_USER_ID", "00000000-0000-0000-0000-000000000000")
    default_user_id = uuid.UUID(default_user_id_env)
    cors_allow_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "")
    cors_allow_origins = [origin.strip() for origin in cors_allow_origins_env.split(",") if origin.strip()]
    if not cors_allow_origins and environment == "development":
        cors_allow_origins = ["*"]
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
    auth_required = os.getenv("AUTH_REQUIRED", "false").lower() == "true"
    jwt_secret = os.getenv("JWT_SECRET", "")
    if not jwt_secret:
        if environment == "production":
            raise RuntimeError("JWT_SECRET is not set")
        jwt_secret = "dev-secret"
    jwt_issuer = os.getenv("JWT_ISSUER", "expense-tracker")
    jwt_audience = os.getenv("JWT_AUDIENCE", "expense-tracker")
    access_token_minutes = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))
    refresh_token_days = int(os.getenv("REFRESH_TOKEN_DAYS", "30"))
    google_client_ids_env = os.getenv("GOOGLE_CLIENT_IDS", "")
    google_client_ids = [
        client_id.strip()
        for client_id in google_client_ids_env.split(",")
        if client_id.strip()
    ]
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
        cors_allow_origins=cors_allow_origins,
        auth_required=auth_required,
        jwt_secret=jwt_secret,
        jwt_issuer=jwt_issuer,
        jwt_audience=jwt_audience,
        access_token_minutes=access_token_minutes,
        refresh_token_days=refresh_token_days,
        google_client_ids=google_client_ids,
    )
