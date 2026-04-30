"""Create core business tables.

Revision ID: 20260427_0001
Revises:
Create Date: 2026-04-27 18:40:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


product_type_enum = postgresql.ENUM("pizza", "drink", name="product_type_enum", create_type=False)
pizza_size_enum = postgresql.ENUM("M", "G", "GG", name="pizza_size_enum", create_type=False)
fulfillment_type_enum = postgresql.ENUM("delivery", "pickup", name="fulfillment_type_enum", create_type=False)
payment_method_enum = postgresql.ENUM("pix", "money", "card", name="payment_method_enum", create_type=False)
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
order_channel_enum = postgresql.ENUM("site", "admin", "whatsapp", name="order_channel_enum", create_type=False)

revision = "20260427_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    product_type_enum.create(bind, checkfirst=True)
    pizza_size_enum.create(bind, checkfirst=True)
    fulfillment_type_enum.create(bind, checkfirst=True)
    payment_method_enum.create(bind, checkfirst=True)
    order_status_enum.create(bind, checkfirst=True)
    order_channel_enum.create(bind, checkfirst=True)

    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=160), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_users")),
        sa.UniqueConstraint("email", name=op.f("uq_admin_users_email")),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("product_type", product_type_enum, nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
        sa.UniqueConstraint("code", name=op.f("uq_categories_code")),
    )
    op.create_index(op.f("ix_categories_product_type"), "categories", ["product_type"], unique=False)

    op.create_table(
        "crust_flavors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crust_flavors")),
        sa.UniqueConstraint("code", name=op.f("uq_crust_flavors_code")),
    )

    op.create_table(
        "crust_prices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("size", pizza_size_enum, nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crust_prices")),
        sa.UniqueConstraint("size", name=op.f("uq_crust_prices_size")),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("badge_text", sa.String(length=40), nullable=True),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], name=op.f("fk_products_category_id_categories")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        sa.UniqueConstraint("code", name=op.f("uq_products_code")),
    )
    op.create_index(op.f("ix_products_category_id"), "products", ["category_id"], unique=False)

    op.create_table(
        "pizza_category_prices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("size", pizza_size_enum, nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name=op.f("fk_pizza_category_prices_category_id_categories"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pizza_category_prices")),
    )
    op.create_unique_constraint(
        "uq_pizza_category_prices_category_id_size",
        "pizza_category_prices",
        ["category_id", "size"],
    )
    op.create_index(
        op.f("ix_pizza_category_prices_category_id"),
        "pizza_category_prices",
        ["category_id"],
        unique=False,
    )

    op.create_table(
        "product_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_product_options_product_id_products"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_options")),
        sa.UniqueConstraint("product_id", "code", name="uq_product_options_product_id_code"),
    )
    op.create_index(op.f("ix_product_options_product_id"), "product_options", ["product_id"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.Uuid(), nullable=False),
        sa.Column("status", order_status_enum, server_default=sa.text("'pending'"), nullable=False),
        sa.Column("channel", order_channel_enum, server_default=sa.text("'site'"), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("customer_phone", sa.String(length=20), nullable=False),
        sa.Column("fulfillment_type", fulfillment_type_enum, nullable=False),
        sa.Column("postal_code", sa.String(length=9), nullable=True),
        sa.Column("neighborhood", sa.String(length=120), nullable=True),
        sa.Column("street", sa.String(length=180), nullable=True),
        sa.Column("number", sa.String(length=40), nullable=True),
        sa.Column("city", sa.String(length=80), nullable=True),
        sa.Column("state", sa.String(length=8), nullable=True),
        sa.Column("complement", sa.String(length=120), nullable=True),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("payment_method", payment_method_enum, nullable=False),
        sa.Column("change_for", sa.Numeric(10, 2), nullable=True),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
        sa.Column("delivery_fee", sa.Numeric(10, 2), server_default=sa.text("0"), nullable=False),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
        sa.UniqueConstraint("public_id", name=op.f("uq_orders_public_id")),
    )
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("product_option_id", sa.Integer(), nullable=True),
        sa.Column("crust_flavor_id", sa.Integer(), nullable=True),
        sa.Column("product_code", sa.String(length=80), nullable=False),
        sa.Column("product_name", sa.String(length=140), nullable=False),
        sa.Column("product_option_label", sa.String(length=120), nullable=True),
        sa.Column("pizza_size", pizza_size_enum, nullable=True),
        sa.Column("crust_name", sa.String(length=100), nullable=True),
        sa.Column("crust_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["crust_flavor_id"], ["crust_flavors.id"], name=op.f("fk_order_items_crust_flavor_id_crust_flavors")),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name=op.f("fk_order_items_order_id_orders")),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], name=op.f("fk_order_items_product_id_products")),
        sa.ForeignKeyConstraint(
            ["product_option_id"],
            ["product_options.id"],
            name=op.f("fk_order_items_product_option_id_product_options"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_items")),
    )
    op.create_index(op.f("ix_order_items_order_id"), "order_items", ["order_id"], unique=False)
    op.create_index(op.f("ix_order_items_product_id"), "order_items", ["product_id"], unique=False)
    op.create_index(op.f("ix_order_items_product_option_id"), "order_items", ["product_option_id"], unique=False)
    op.create_index(op.f("ix_order_items_crust_flavor_id"), "order_items", ["crust_flavor_id"], unique=False)

    categories_table = sa.table(
        "categories",
        sa.column("id", sa.Integer()),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("product_type", product_type_enum),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        categories_table,
        [
            {"id": 1, "code": "tradicional", "name": "Pizzas Tradicionais", "product_type": "pizza", "sort_order": 1, "is_active": True},
            {"id": 2, "code": "especial", "name": "Pizzas Especiais", "product_type": "pizza", "sort_order": 2, "is_active": True},
            {"id": 3, "code": "premium", "name": "Pizzas Premium", "product_type": "pizza", "sort_order": 3, "is_active": True},
            {"id": 4, "code": "doce", "name": "Pizzas Doces", "product_type": "pizza", "sort_order": 4, "is_active": True},
            {"id": 5, "code": "refrigerantes", "name": "Refrigerantes", "product_type": "drink", "sort_order": 5, "is_active": True},
            {"id": 6, "code": "cervejas", "name": "Cervejas", "product_type": "drink", "sort_order": 6, "is_active": True},
            {"id": 7, "code": "sucos", "name": "Sucos", "product_type": "drink", "sort_order": 7, "is_active": True},
            {"id": 8, "code": "outros", "name": "Outras Bebidas", "product_type": "drink", "sort_order": 8, "is_active": True},
        ],
    )

    pizza_category_prices_table = sa.table(
        "pizza_category_prices",
        sa.column("category_id", sa.Integer()),
        sa.column("size", pizza_size_enum),
        sa.column("price", sa.Numeric(10, 2)),
    )
    op.bulk_insert(
        pizza_category_prices_table,
        [
            {"category_id": 1, "size": "M", "price": 42},
            {"category_id": 1, "size": "G", "price": 48},
            {"category_id": 1, "size": "GG", "price": 56},
            {"category_id": 2, "size": "M", "price": 46},
            {"category_id": 2, "size": "G", "price": 52},
            {"category_id": 2, "size": "GG", "price": 60},
            {"category_id": 3, "size": "M", "price": 50},
            {"category_id": 3, "size": "G", "price": 56},
            {"category_id": 3, "size": "GG", "price": 66},
            {"category_id": 4, "size": "M", "price": 46},
            {"category_id": 4, "size": "G", "price": 52},
            {"category_id": 4, "size": "GG", "price": 60},
        ],
    )

    crust_flavors_table = sa.table(
        "crust_flavors",
        sa.column("id", sa.Integer()),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        crust_flavors_table,
        [
            {
                "id": 1,
                "code": "original",
                "name": "Original",
                "description": "Recheio tradicional.",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "id": 2,
                "code": "cream-cheese",
                "name": "Cream Cheese",
                "description": "Mais cremosa e suave.",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "id": 3,
                "code": "chocolate",
                "name": "Chocolate",
                "description": "Indicada para pizzas doces.",
                "sort_order": 3,
                "is_active": True,
            },
        ],
    )

    crust_prices_table = sa.table(
        "crust_prices",
        sa.column("size", pizza_size_enum),
        sa.column("price", sa.Numeric(10, 2)),
    )
    op.bulk_insert(
        crust_prices_table,
        [
            {"size": "M", "price": 10},
            {"size": "G", "price": 12},
            {"size": "GG", "price": 15},
        ],
    )

    op.execute(
        "SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM categories), true)"
    )
    op.execute(
        "SELECT setval(pg_get_serial_sequence('crust_flavors', 'id'), (SELECT COALESCE(MAX(id), 1) FROM crust_flavors), true)"
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_order_items_crust_flavor_id"), table_name="order_items")
    op.drop_index(op.f("ix_order_items_product_option_id"), table_name="order_items")
    op.drop_index(op.f("ix_order_items_product_id"), table_name="order_items")
    op.drop_index(op.f("ix_order_items_order_id"), table_name="order_items")
    op.drop_table("order_items")

    op.drop_index(op.f("ix_orders_status"), table_name="orders")
    op.drop_table("orders")

    op.drop_index(op.f("ix_product_options_product_id"), table_name="product_options")
    op.drop_table("product_options")

    op.drop_index(op.f("ix_pizza_category_prices_category_id"), table_name="pizza_category_prices")
    op.drop_constraint("uq_pizza_category_prices_category_id_size", "pizza_category_prices", type_="unique")
    op.drop_table("pizza_category_prices")

    op.drop_index(op.f("ix_products_category_id"), table_name="products")
    op.drop_table("products")

    op.drop_table("crust_prices")
    op.drop_table("crust_flavors")

    op.drop_index(op.f("ix_categories_product_type"), table_name="categories")
    op.drop_table("categories")

    op.drop_table("admin_users")

    order_channel_enum.drop(op.get_bind(), checkfirst=True)
    order_status_enum.drop(op.get_bind(), checkfirst=True)
    payment_method_enum.drop(op.get_bind(), checkfirst=True)
    fulfillment_type_enum.drop(op.get_bind(), checkfirst=True)
    pizza_size_enum.drop(op.get_bind(), checkfirst=True)
    product_type_enum.drop(op.get_bind(), checkfirst=True)
