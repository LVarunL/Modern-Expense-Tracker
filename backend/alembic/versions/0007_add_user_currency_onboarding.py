"""Add currency and onboarding status to users."""

from alembic import op
import sqlalchemy as sa

revision = "0007_add_user_currency_onboarding"
down_revision = "0006_add_user_timezone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
            server_default=sa.text("'INR'"),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "currency")
