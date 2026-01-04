"""Post-processing rules for parser output."""

from __future__ import annotations

import re
from decimal import Decimal

from src.models.enums import TransactionDirection, TransactionType
from src.parser.prompts import ALLOWED_CATEGORIES, ALLOWED_TYPES
from src.parser.schema import LLMParseOutput, LLMTransaction

LARGE_AMOUNT_THRESHOLD = Decimal("1000000")

TYPE_DIRECTION_MAP: dict[TransactionType, TransactionDirection] = {
    TransactionType.expense: TransactionDirection.outflow,
    TransactionType.income: TransactionDirection.inflow,
    TransactionType.repayment_received: TransactionDirection.inflow,
    TransactionType.repayment_sent: TransactionDirection.outflow,
    TransactionType.investment_income: TransactionDirection.inflow,
    TransactionType.refund: TransactionDirection.inflow,
    TransactionType.transfer: TransactionDirection.outflow,
}

TYPE_CATEGORY_MAP: dict[TransactionType, str] = {
    TransactionType.income: "Income",
    TransactionType.investment_income: "Investments",
    TransactionType.repayment_received: "Loans",
    TransactionType.repayment_sent: "Loans",
    TransactionType.transfer: "Transfer",
}


def _normalize_type(value: str) -> tuple[TransactionType, bool]:
    lowered = value.strip().lower()
    for allowed in ALLOWED_TYPES:
        if lowered == allowed:
            return TransactionType(allowed), True
    return TransactionType.other, False


def _normalize_direction(value: str) -> TransactionDirection | None:
    lowered = value.strip().lower()
    if lowered == "inflow":
        return TransactionDirection.inflow
    if lowered == "outflow":
        return TransactionDirection.outflow
    return None


def _detect_split_count(raw_text: str) -> int | None:
    if "split" not in raw_text.lower():
        return None
    match = re.search(r"split\s+(?:among|between)?\s*(\d+)", raw_text, re.IGNORECASE)
    if match:
        count = int(match.group(1))
        return count if count > 1 else None
    match = re.search(r"(\d+)\s*(people|persons|friends|pax)", raw_text, re.IGNORECASE)
    if match:
        count = int(match.group(1))
        return count if count > 1 else None
    return 2


def _coerce_amount(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _apply_amount_rules(
    amount: Decimal,
    assumptions: list[str],
) -> tuple[Decimal, list[str], bool]:
    needs_confirmation = False
    if amount <= 0:
        assumptions.append("Amount was non-positive; please confirm.")
        amount = abs(amount)
        needs_confirmation = True
    if amount >= LARGE_AMOUNT_THRESHOLD:
        assumptions.append("Amount is unusually large; please confirm.")
        needs_confirmation = True
    return amount, assumptions, needs_confirmation


def post_process(parsed: LLMParseOutput, raw_text: str) -> dict[str, object]:
    entry_assumptions: list[str] = []
    entry_needs_confirmation = parsed.needs_confirmation
    split_count = _detect_split_count(raw_text)

    processed_transactions: list[dict[str, object]] = []

    for tx in parsed.transactions:
        processed = _process_transaction(tx, split_count)
        processed_transactions.append(processed)
        if processed["needs_confirmation"]:
            entry_needs_confirmation = True
        for assumption in processed["assumptions"]:
            if assumption not in entry_assumptions:
                entry_assumptions.append(assumption)

    if not processed_transactions:
        entry_assumptions = list(parsed.assumptions)
        entry_needs_confirmation = True

    return {
        "entry_summary": parsed.entry_summary,
        "occurred_at": parsed.occurred_at,
        "transactions": processed_transactions,
        "needs_confirmation": entry_needs_confirmation,
        "assumptions": entry_assumptions,
    }


def _process_transaction(
    tx: LLMTransaction,
    split_count: int | None,
) -> dict[str, object]:
    assumptions = list(tx.assumptions)
    needs_confirmation = tx.needs_confirmation
    amount = _coerce_amount(tx.amount)
    amount, assumptions, amount_needs = _apply_amount_rules(amount, assumptions)
    if amount_needs:
        needs_confirmation = True

    transaction_type, recognized_type = _normalize_type(tx.type)
    if not recognized_type:
        assumptions.append("Type not recognized; set to other.")
        needs_confirmation = True

    direction = _normalize_direction(tx.direction)
    expected_direction = TYPE_DIRECTION_MAP.get(transaction_type)
    if direction is None:
        direction = expected_direction or TransactionDirection.outflow
        assumptions.append("Direction was invalid; defaulted.")
        needs_confirmation = True
    elif expected_direction and direction != expected_direction:
        direction = expected_direction
        assumptions.append("Direction adjusted to match type.")
        needs_confirmation = True

    category = tx.category.strip() if tx.category else "Other"
    if category not in ALLOWED_CATEGORIES:
        category = "Other"
        assumptions.append("Category set to Other.")
        needs_confirmation = True

    mapped_category = TYPE_CATEGORY_MAP.get(transaction_type)
    if mapped_category and category != mapped_category:
        category = mapped_category
        assumptions.append("Category adjusted to match type.")
        needs_confirmation = True

    if split_count:
        amount = (amount / Decimal(split_count)).quantize(Decimal("0.01"))
        assumptions.append(f"Split assumed {split_count} people.")
        needs_confirmation = True

    return {
        "amount": amount,
        "currency": tx.currency or "INR",
        "direction": direction,
        "type": transaction_type,
        "category": category,
        "needs_confirmation": needs_confirmation,
        "assumptions": assumptions,
    }
