"""Add users and auth tables."""

from alembic import op
import sqlalchemy as sa

revision = "0004_add_users_and_auth"
down_revision = "0003_simplify_transactions"
branch_labels = None
depends_on = None


DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"
DEFAULT_USER_EMAIL = "demo@expense.local"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.execute(
        sa.text(
            "INSERT INTO users (id, email, password_hash, is_active) "
            "VALUES (CAST(:user_id AS uuid), :email, NULL, true)"
        ).bindparams(user_id=DEFAULT_USER_ID, email=DEFAULT_USER_EMAIL)
    )

    op.create_table(
        "oauth_identities",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.Enum("google", "apple", name="oauth_provider"), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_oauth_identity_user"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
    )
    op.create_index("ix_oauth_identities_user_id", "oauth_identities", ["user_id"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_auth_session_user"),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"])

    op.add_column("entries", sa.Column("user_id_uuid", sa.UUID(as_uuid=True), nullable=True))
    op.execute(
        sa.text(
            "UPDATE entries SET user_id_uuid = CAST(:default_user_id AS uuid)"
        ).bindparams(default_user_id=DEFAULT_USER_ID)
    )
    op.drop_column("entries", "user_id")
    op.alter_column(
        "entries",
        "user_id_uuid",
        new_column_name="user_id",
        existing_type=sa.UUID(as_uuid=True),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_entries_user",
        "entries",
        "users",
        ["user_id"],
        ["id"],
    )
    op.create_index("ix_entries_user_id", "entries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_entries_user_id", table_name="entries")
    op.drop_constraint("fk_entries_user", "entries", type_="foreignkey")
    op.add_column("entries", sa.Column("user_id_text", sa.String(length=64), nullable=True))
    op.execute(
        sa.text("UPDATE entries SET user_id_text = CAST(user_id AS VARCHAR(64))")
    )
    op.drop_column("entries", "user_id")
    op.alter_column(
        "entries",
        "user_id_text",
        new_column_name="user_id",
        existing_type=sa.String(length=64),
        nullable=False,
    )

    op.drop_index("ix_auth_sessions_token_hash", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_index("ix_oauth_identities_user_id", table_name="oauth_identities")
    op.drop_table("oauth_identities")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS oauth_provider")
