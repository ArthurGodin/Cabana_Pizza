"""Add P size to pizza_size_enum.

Revision ID: 20260527_0007
Revises: 20260430_0006
Create Date: 2026-05-27 12:00:00
"""

from __future__ import annotations

from alembic import op


revision = "20260527_0007"
down_revision = "20260430_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE pizza_size_enum ADD VALUE IF NOT EXISTS 'P' BEFORE 'M'")


def downgrade() -> None:
    raise NotImplementedError(
        "PostgreSQL does not support removing enum values without recreating the type."
    )
