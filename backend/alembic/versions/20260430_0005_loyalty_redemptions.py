"""Add loyalty redemption tracking.

Revision ID: 20260430_0005
Revises: 20260430_0004
Create Date: 2026-04-30 14:15:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260430_0005"
down_revision = "20260430_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "loyalty_redemptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_phone", sa.String(length=20), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=True),
        sa.Column("pizza_name", sa.String(length=140), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("redeemed_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.ForeignKeyConstraint(["redeemed_by_admin_id"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_loyalty_redemptions_customer_phone", "loyalty_redemptions", ["customer_phone"])
    op.create_index("ix_loyalty_redemptions_order_id", "loyalty_redemptions", ["order_id"])
    op.create_index(
        "ix_loyalty_redemptions_redeemed_by_admin_id",
        "loyalty_redemptions",
        ["redeemed_by_admin_id"],
    )
    op.execute('ALTER TABLE public."loyalty_redemptions" ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE public."loyalty_redemptions" FROM anon;
            END IF;

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON TABLE public."loyalty_redemptions" FROM authenticated;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.drop_index("ix_loyalty_redemptions_redeemed_by_admin_id", table_name="loyalty_redemptions")
    op.drop_index("ix_loyalty_redemptions_order_id", table_name="loyalty_redemptions")
    op.drop_index("ix_loyalty_redemptions_customer_phone", table_name="loyalty_redemptions")
    op.drop_table("loyalty_redemptions")
