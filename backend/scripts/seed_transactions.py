"""Seed or delete mock transactions for local testing."""

from __future__ import annotations

import argparse
import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from src.config import get_settings
from src.database.connection import SessionLocal
from src.models.entry import Entry
from src.models.enums import EntryStatus, TransactionDirection, TransactionType
from src.models.transaction import Transaction
from src.models.user import User
from src.services import EntryCreate, TransactionCreate, create_entry, create_transactions


CATEGORIES = [
    "Food & Drinks",
    "Groceries",
    "Transport",
    "Entertainment",
    "Shopping",
    "Subscriptions",
    "Bills & Utilities",
    "Health",
    "Rent",
    "Travel",
    "Education",
    "Other",
]

TYPE_TO_CATEGORY = {
    TransactionType.income: "Income",
    TransactionType.investment_income: "Investments",
    TransactionType.repayment_received: "Loans",
    TransactionType.repayment_sent: "Loans",
    TransactionType.transfer: "Transfer",
}

TYPE_TO_DIRECTION = {
    TransactionType.expense: TransactionDirection.outflow,
    TransactionType.income: TransactionDirection.inflow,
    TransactionType.repayment_received: TransactionDirection.inflow,
    TransactionType.repayment_sent: TransactionDirection.outflow,
    TransactionType.refund: TransactionDirection.inflow,
    TransactionType.transfer: TransactionDirection.outflow,
    TransactionType.investment_income: TransactionDirection.inflow,
    TransactionType.other: TransactionDirection.outflow,
}

TRANSACTION_TYPES = list(TYPE_TO_DIRECTION.keys())


def _pick_amount(tx_type: TransactionType, rng: random.Random) -> int:
    if tx_type in {TransactionType.income, TransactionType.investment_income}:
        return rng.randint(5000, 60000)
    if tx_type in {TransactionType.repayment_received, TransactionType.repayment_sent}:
        return rng.randint(200, 5000)
    if tx_type == TransactionType.transfer:
        return rng.randint(1000, 20000)
    return rng.randint(50, 5000)


def _pick_category(tx_type: TransactionType, rng: random.Random) -> str:
    mapped = TYPE_TO_CATEGORY.get(tx_type)
    if mapped:
        return mapped
    return rng.choice(CATEGORIES)


def _pick_occurred_at(days: int, rng: random.Random) -> datetime:
    offset = rng.randint(0, max(days - 1, 0))
    hours = rng.randint(0, 23)
    minutes = rng.randint(0, 59)
    return datetime.now(timezone.utc) - timedelta(days=offset, hours=hours, minutes=minutes)


async def create_seed(
    *,
    count: int,
    days: int,
    tag: str,
    seed: int | None,
    user_id: uuid.UUID | None,
    user_email: str | None,
) -> int:
    rng = random.Random(seed)
    async with SessionLocal() as session:
        async with session.begin():
            user = None
            if user_email:
                user = await session.scalar(
                    select(User).where(User.email == user_email)
                )
                if user:
                    if user_id and user.id != user_id:
                        raise ValueError(
                            "Provided user id does not match the email's user."
                        )
                    user_id = user.id
            if user_id and not user:
                user = await session.scalar(select(User).where(User.id == user_id))
                if user and user_email and user.email != user_email:
                    raise ValueError(
                        "Provided user email does not match the user id."
                    )
            if not user:
                if not user_email:
                    raise ValueError(
                        "User not found. Pass --user-email to create or use an existing user id."
                    )
                if not user_id:
                    user_id = uuid.uuid4()
                session.add(
                    User(
                        id=user_id,
                        email=user_email,
                        password_hash=None,
                    )
                )
                await session.flush()
            entry = await create_entry(
                session,
                entry=EntryCreate(
                    user_id=user_id,
                    raw_text=f"Seeded {count} transactions",
                    status=EntryStatus.confirmed,
                    notes=tag,
                ),
                commit=False,
            )
            transactions = []
            for _ in range(count):
                tx_type = rng.choice(TRANSACTION_TYPES)
                transactions.append(
                    TransactionCreate(
                        entry_id=entry.id,
                        occurred_at=_pick_occurred_at(days, rng),
                        amount=_pick_amount(tx_type, rng),
                        currency="INR",
                        direction=TYPE_TO_DIRECTION[tx_type],
                        type=tx_type,
                        category=_pick_category(tx_type, rng),
                    )
                )
            await create_transactions(session, items=transactions, commit=False)
            await session.flush()
            return entry.id


async def delete_seed(*, tag: str) -> tuple[int, int]:
    async with SessionLocal() as session:
        async with session.begin():
            entry_ids_result = await session.execute(
                select(Entry.id).where(Entry.notes == tag)
            )
            entry_ids = [row[0] for row in entry_ids_result.fetchall()]
            if not entry_ids:
                return 0, 0

            transaction_count = await session.scalar(
                select(func.count(Transaction.id)).where(Transaction.entry_id.in_(entry_ids))
            )
            entry_count = len(entry_ids)

            await session.execute(
                Transaction.__table__.delete().where(Transaction.entry_id.in_(entry_ids))
            )
            await session.execute(Entry.__table__.delete().where(Entry.id.in_(entry_ids)))
            return entry_count, int(transaction_count or 0)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Seed mock transactions.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Insert mock transactions.")
    create_parser.add_argument("--count", type=int, default=300)
    create_parser.add_argument("--days", type=int, default=60)
    create_parser.add_argument("--tag", type=str, default="seed:bulk")
    create_parser.add_argument("--seed", type=int, default=None)
    create_parser.add_argument(
        "--user-id",
        type=str,
        default=None,
        help="User UUID to attach seeded entries to.",
    )
    create_parser.add_argument(
        "--user-email",
        type=str,
        default=None,
        help="Create the user with this email if the user id does not exist.",
    )

    delete_parser = subparsers.add_parser("delete", help="Delete seeded transactions.")
    delete_parser.add_argument("--tag", type=str, default="seed:bulk")

    return parser


async def _run() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    settings = get_settings()

    if args.command == "create":
        user_id = uuid.UUID(args.user_id) if args.user_id else None
        if not user_id and not args.user_email:
            user_id = settings.default_user_id
        entry_id = await create_seed(
            count=args.count,
            days=args.days,
            tag=args.tag,
            seed=args.seed,
            user_id=user_id,
            user_email=args.user_email,
        )
        print(
            f"Created entry {entry_id} with {args.count} transactions for user {user_id}."
        )
        return

    entry_count, transaction_count = await delete_seed(tag=args.tag)
    print(
        f"Deleted {transaction_count} transactions across {entry_count} entries with tag '{args.tag}'."
    )


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
