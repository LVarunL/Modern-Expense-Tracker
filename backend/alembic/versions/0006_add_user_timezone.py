"""Add timezone to users."""

from alembic import op
import sqlalchemy as sa

revision = "0006_add_user_timezone"
down_revision = "0005_add_auth_otps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default=sa.text("'UTC'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "timezone")
