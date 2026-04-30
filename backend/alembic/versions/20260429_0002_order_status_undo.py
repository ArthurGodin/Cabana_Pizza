"""Add undo support metadata to orders.

Revision ID: 20260429_0002
Revises: 20260427_0001
Create Date: 2026-04-29 19:35:00
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

revision = "20260429_0002"
down_revision = "20260427_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("previous_status", order_status_enum, nullable=True))
    op.add_column("orders", sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "status_changed_at")
    op.drop_column("orders", "previous_status")
