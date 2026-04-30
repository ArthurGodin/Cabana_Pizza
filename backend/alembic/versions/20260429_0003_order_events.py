"""Add order event audit trail.

Revision ID: 20260429_0003
Revises: 20260429_0002
Create Date: 2026-04-29 20:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


order_status_enum = postgresql.ENUM(
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "completed",
    "cancelled",
    name="order_status_enum",
    create_type=False,
)

revision = "20260429_0003"
down_revision = "20260429_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "order_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("admin_user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("previous_status", order_status_enum, nullable=True),
        sa.Column("next_status", order_status_enum, nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["admin_user_id"], ["admin_users.id"], name="fk_order_events_admin_user_id_admin_users"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_order_events_order_id_orders"),
        sa.PrimaryKeyConstraint("id", name="pk_order_events"),
    )
    op.create_index(op.f("ix_order_events_admin_user_id"), "order_events", ["admin_user_id"], unique=False)
    op.create_index(op.f("ix_order_events_order_id"), "order_events", ["order_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_order_events_order_id"), table_name="order_events")
    op.drop_index(op.f("ix_order_events_admin_user_id"), table_name="order_events")
    op.drop_table("order_events")
