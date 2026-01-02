"""Remove confidence column from transactions."""

from alembic import op
import sqlalchemy as sa

revision = "0002_remove_confidence"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("transactions", "confidence")


def downgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "confidence",
            sa.Float(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
