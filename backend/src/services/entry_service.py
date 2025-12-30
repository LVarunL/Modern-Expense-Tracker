"""Entry CRUD operations."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entry import Entry
from src.models.enums import EntryStatus
from src.services.schemas import EntryCreate


async def create_entry(
    session: AsyncSession,
    *,
    entry: EntryCreate,
    commit: bool = True,
) -> Entry:
    entry = Entry(
        user_id=entry.user_id,
        raw_text=entry.raw_text,
        source=entry.source,
        occurred_at_hint=entry.occurred_at_hint,
        parser_output_json=entry.parser_output_json,
        parser_version=entry.parser_version,
        status=entry.status,
        notes=entry.notes,
    )
    session.add(entry)
    if commit:
        await session.commit()
        await session.refresh(entry)
    else:
        await session.flush()
    return entry


async def get_entry(session: AsyncSession, entry_id: int) -> Entry | None:
    result = await session.execute(select(Entry).where(Entry.id == entry_id))
    return result.scalar_one_or_none()


async def update_entry_status(
    session: AsyncSession,
    *,
    entry: Entry,
    status: EntryStatus,
    commit: bool = True,
) -> Entry:
    entry.status = status
    if commit:
        await session.commit()
        await session.refresh(entry)
    else:
        await session.flush()
    return entry


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
