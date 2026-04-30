"""Enable row level security on public tables.

Revision ID: 20260430_0004
Revises: 20260429_0003
Create Date: 2026-04-30 13:05:00
"""

from __future__ import annotations

from alembic import op


revision = "20260430_0004"
down_revision = "20260429_0003"
branch_labels = None
depends_on = None


PUBLIC_TABLES = (
    "alembic_version",
    "categories",
    "crust_prices",
    "crust_flavors",
    "pizza_category_prices",
    "products",
    "product_options",
    "orders",
    "order_items",
    "admin_users",
    "order_events",
)


def upgrade() -> None:
    for table in PUBLIC_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
        op.execute(
            f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                    REVOKE ALL ON TABLE public."{table}" FROM anon;
                END IF;

                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                    REVOKE ALL ON TABLE public."{table}" FROM authenticated;
                END IF;
            END
            $$;
            """
        )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
            END IF;

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    for table in reversed(PUBLIC_TABLES):
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
