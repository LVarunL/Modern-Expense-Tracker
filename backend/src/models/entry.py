"""Entry model."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.models.base import Base
from src.models.enums import EntrySource, EntryStatus


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[EntrySource] = mapped_column(
        Enum(EntrySource, name="entry_source"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    occurred_at_hint: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    parser_output_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    parser_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[EntryStatus] = mapped_column(
        Enum(EntryStatus, name="entry_status"),
        nullable=False,
        server_default=EntryStatus.parsed.value,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="entry",
        cascade="all, delete-orphan",
    )
