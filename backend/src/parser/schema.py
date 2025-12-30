"""Parser output schema for LLM responses."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LLMTransaction(BaseModel):
    amount: float
    currency: str = "INR"
    direction: str
    type: str
    category: str
    subcategory: str | None = None
    merchant: str | None = None
    confidence: float = 0.0
    needs_confirmation: bool = False
    assumptions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class LLMParseOutput(BaseModel):
    entry_summary: str | None = None
    occurred_at: datetime | None = None
    transactions: list[LLMTransaction] = Field(default_factory=list)
    overall_confidence: float = 0.0
    needs_confirmation: bool = False
    assumptions: list[str] = Field(default_factory=list)
    follow_up_question: str | None = None

    model_config = ConfigDict(extra="forbid")
