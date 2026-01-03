from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from decimal import Decimal

from src.config import get_settings
from src.models.base import Base
from src.models.enums import TransactionDirection, TransactionType
from src.parser.service import ParsedResult, get_parser



@pytest.fixture()
async def test_engine(monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[AsyncEngine, None]:
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setenv("DEFAULT_USER_ID", "test-user")
    monkeypatch.setenv("ENVIRONMENT", "test")
    get_settings.cache_clear()

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture()
async def session_maker(test_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture()
async def db_session(
    session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    async with session_maker() as session:
        yield session


@pytest.fixture()
async def app(session_maker: async_sessionmaker[AsyncSession]):
    from src.app import create_app
    from src.database import get_session
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_maker() as session:
            yield session

    class FakeParser:
        async def parse(self, *, raw_text: str, occurred_at_hint, reference_datetime):
            preview = {
                "entry_summary": f"Parsed: {raw_text}",
                "occurred_at": occurred_at_hint,
                "transactions": [
                    {
                        "amount": Decimal("100.00"),
                        "currency": "INR",
                        "direction": TransactionDirection.outflow,
                        "type": TransactionType.expense,
                        "category": "Food & Drinks",
                        "subcategory": None,
                        "merchant": None,
                        "needs_confirmation": True,
                        "assumptions": [],
                    }
                ],
                "needs_confirmation": True,
                "assumptions": [],
                "follow_up_question": None,
            }
            return ParsedResult(
                preview=preview,
                raw_output={"mock": True},
                post_processed=preview,
                parser_version="test",
            )

    def override_get_parser() -> FakeParser:
        return FakeParser()

    app = create_app()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_parser] = override_get_parser
    return app


@pytest.fixture()
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
