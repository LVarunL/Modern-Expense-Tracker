"""Entry CRUD operations."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entry import Entry
from src.models.enums import EntrySource, EntryStatus


async def create_entry(
    session: AsyncSession,
    *,
    user_id: str,
    raw_text: str,
    source: EntrySource = EntrySource.manual_text,
    occurred_at_hint: datetime | None = None,
    parser_output_json: dict[str, Any] | None = None,
    parser_version: str | None = None,
    status: EntryStatus = EntryStatus.parsed,
    notes: str | None = None,
) -> Entry:
    entry = Entry(
        user_id=user_id,
        raw_text=raw_text,
        source=source,
        occurred_at_hint=occurred_at_hint,
        parser_output_json=parser_output_json,
        parser_version=parser_version,
        status=status,
        notes=notes,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry


async def get_entry(session: AsyncSession, entry_id: int) -> Entry | None:
    result = await session.execute(select(Entry).where(Entry.id == entry_id))
    return result.scalar_one_or_none()


async def list_entries(
    session: AsyncSession,
    *,
    user_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Entry]:
    query = select(Entry).order_by(Entry.created_at.desc()).limit(limit).offset(offset)
    if user_id:
        query = query.where(Entry.user_id == user_id)
    result = await session.execute(query)
    return list(result.scalars())
