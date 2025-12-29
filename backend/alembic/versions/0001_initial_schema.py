"""Initial schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    entry_source_enum = sa.Enum("manual_text", name="entry_source")
    entry_status_enum = sa.Enum(
        "parsed",
        "pending_confirmation",
        "confirmed",
        "rejected",
        name="entry_status",
    )
    transaction_direction_enum = sa.Enum("inflow", "outflow", name="transaction_direction")
    transaction_type_enum = sa.Enum(
        "expense",
        "income",
        "repayment_received",
        "repayment_sent",
        "refund",
        "transfer",
        "investment_income",
        "other",
        name="transaction_type",
    )

    entry_source_enum.create(op.get_bind(), checkfirst=True)
    entry_status_enum.create(op.get_bind(), checkfirst=True)
    transaction_direction_enum.create(op.get_bind(), checkfirst=True)
    transaction_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("source", entry_source_enum, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("occurred_at_hint", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parser_output_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("parser_version", sa.String(length=50), nullable=True),
        sa.Column(
            "status",
            entry_status_enum,
            server_default=sa.text("'parsed'"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "currency",
            sa.String(length=3),
            server_default=sa.text("'INR'"),
            nullable=False,
        ),
        sa.Column("direction", transaction_direction_enum, nullable=False),
        sa.Column("type", transaction_type_enum, nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("subcategory", sa.String(length=50), nullable=True),
        sa.Column("merchant", sa.String(length=120), nullable=True),
        sa.Column(
            "confidence",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "needs_confirmation",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("assumptions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["entry_id"], ["entries.id"]),
    )

    op.create_index("ix_transactions_entry_id", "transactions", ["entry_id"])
    op.create_index("ix_transactions_occurred_at", "transactions", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_transactions_occurred_at", table_name="transactions")
    op.drop_index("ix_transactions_entry_id", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("entries")

    op.execute("DROP TYPE IF EXISTS transaction_type")
    op.execute("DROP TYPE IF EXISTS transaction_direction")
    op.execute("DROP TYPE IF EXISTS entry_status")
    op.execute("DROP TYPE IF EXISTS entry_source")
