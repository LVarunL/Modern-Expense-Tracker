from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest

from src.models.enums import TransactionDirection, TransactionType
from src.parser.postprocess import post_process
from src.parser.schema import LLMParseOutput, LLMTransaction


def test_post_process_amount_rules() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=-50,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Coffee")
    transaction = result["transactions"][0]
    assert transaction["amount"] == Decimal("50.00")
    assert transaction["needs_confirmation"] is True
    assert "Amount was non-positive; please confirm." in transaction["assumptions"]


def test_post_process_direction_and_type() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="inflow",
                type="expense",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Snacks")
    transaction = result["transactions"][0]
    assert transaction["direction"] == TransactionDirection.outflow
    assert transaction["type"] == TransactionType.expense
    assert "Direction adjusted to match type." in transaction["assumptions"]


def test_post_process_invalid_direction_defaults() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="sideways",
                type="expense",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Snack")
    transaction = result["transactions"][0]
    assert transaction["direction"] == TransactionDirection.outflow
    assert "Direction was invalid; defaulted." in transaction["assumptions"]


def test_post_process_invalid_category() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="outflow",
                type="expense",
                category="MadeUp",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Snack")
    transaction = result["transactions"][0]
    assert transaction["category"] == "Other"
    assert "Category set to Other." in transaction["assumptions"]


def test_post_process_split_handling() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Split the bill")
    transaction = result["transactions"][0]
    assert transaction["amount"] == Decimal("50.00")
    assert "Split assumed 2 people." in transaction["assumptions"]


def test_post_process_split_with_count() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=900,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Split among 3 people")
    transaction = result["transactions"][0]
    assert transaction["amount"] == Decimal("300.00")
    assert "Split assumed 3 people." in transaction["assumptions"]


def test_post_process_type_unrecognized() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="outflow",
                type="random",
                category="Food & Drinks",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Snack")
    transaction = result["transactions"][0]
    assert transaction["type"] == TransactionType.other
    assert "Type not recognized; set to other." in transaction["assumptions"]


def test_post_process_large_amount_flags_confirmation() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=2_000_000,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Shopping",
                confidence=0.9,
                needs_confirmation=False,
                assumptions=[],
            )
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Bought a car")
    transaction = result["transactions"][0]
    assert transaction["needs_confirmation"] is True
    assert "Amount is unusually large; please confirm." in transaction["assumptions"]


def test_post_process_overall_confidence() -> None:
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=None,
        transactions=[
            LLMTransaction(
                amount=100,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Food & Drinks",
                confidence=0.2,
                needs_confirmation=False,
                assumptions=[],
            ),
            LLMTransaction(
                amount=200,
                currency="INR",
                direction="outflow",
                type="expense",
                category="Transport",
                confidence=0.6,
                needs_confirmation=False,
                assumptions=[],
            ),
        ],
        overall_confidence=0.9,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )

    result = post_process(parsed, raw_text="Transit")
    assert result["overall_confidence"] == pytest.approx(0.4)


def test_post_process_keeps_occurred_at() -> None:
    when = datetime(2025, 1, 1, tzinfo=timezone.utc)
    parsed = LLMParseOutput(
        entry_summary=None,
        occurred_at=when,
        transactions=[],
        overall_confidence=0.0,
        needs_confirmation=False,
        assumptions=[],
        follow_up_question=None,
    )
    result = post_process(parsed, raw_text="No tx")
    assert result["occurred_at"] == when
