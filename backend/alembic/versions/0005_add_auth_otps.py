"""Add auth OTPs table."""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_auth_otps"
down_revision = "0004_add_users_and_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_otps",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "purpose",
            sa.Enum("forgot_password", "reset_password", name="otp_purpose"),
            nullable=False,
        ),
        sa.Column("otp_hash", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_auth_otp_user"),
    )
    op.create_index("ix_auth_otps_user_id", "auth_otps", ["user_id"])
    op.create_index("ix_auth_otps_email", "auth_otps", ["email"])


def downgrade() -> None:
    op.drop_index("ix_auth_otps_email", table_name="auth_otps")
    op.drop_index("ix_auth_otps_user_id", table_name="auth_otps")
    op.drop_table("auth_otps")
    op.execute("DROP TYPE IF EXISTS otp_purpose")
