"""Simplify transactions and entry timestamps."""

from alembic import op
import sqlalchemy as sa

revision = "0003_simplify_transactions"
down_revision = "0002_remove_confidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("entries", "occurred_at_hint")
    op.add_column(
        "entries",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.add_column(
        "transactions",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.drop_column("transactions", "subcategory")
    op.drop_column("transactions", "merchant")
    op.drop_column("transactions", "needs_confirmation")


def downgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("needs_confirmation", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "transactions",
        sa.Column("merchant", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("subcategory", sa.String(length=50), nullable=True),
    )
    op.drop_column("transactions", "updated_at")
    op.drop_column("transactions", "created_at")

    op.drop_column("entries", "updated_at")
    op.add_column(
        "entries",
        sa.Column("occurred_at_hint", sa.DateTime(timezone=True), nullable=True),
    )
