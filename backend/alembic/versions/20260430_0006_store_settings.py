"""Add store operational settings.

Revision ID: 20260430_0006
Revises: 20260430_0005
Create Date: 2026-04-30 20:55:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260430_0006"
down_revision = "20260430_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("is_ordering_paused", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("pause_reason", sa.Text(), nullable=True),
        sa.Column("updated_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_admin_id"], ["admin_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_settings_updated_by_admin_id", "store_settings", ["updated_by_admin_id"])
    op.execute(
        """
        INSERT INTO store_settings (id, is_ordering_paused, pause_reason)
        VALUES (1, false, NULL)
        ON CONFLICT (id) DO NOTHING
        """
    )
    op.execute('ALTER TABLE public."store_settings" ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE public."store_settings" FROM anon;
            END IF;

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON TABLE public."store_settings" FROM authenticated;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.drop_index("ix_store_settings_updated_by_admin_id", table_name="store_settings")
    op.drop_table("store_settings")
