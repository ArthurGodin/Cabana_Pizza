from __future__ import annotations

import json
from copy import deepcopy
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, PizzaCategoryPrice, Product, ProductOption

MENU_SEED_PATH = Path(__file__).resolve().parents[3] / "src" / "data" / "menu.json"
DRINK_GROUP_TO_CATEGORY_CODE = {
    "Refrigerantes": "refrigerantes",
    "Cervejas": "cervejas",
    "Sucos": "sucos",
    "Outros": "outros",
}


def load_menu_seed() -> dict[str, Any]:
    with MENU_SEED_PATH.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def sync_menu_seed_to_db(db: Session) -> dict[str, int]:
    seed = load_menu_seed()
    categories = db.scalars(select(Category)).all()
    categories_by_code = {category.code: category for category in categories}

    seeded_products = 0
    seeded_options = 0
    seeded_prices = 0

    for category_data in seed["categories"]:
        if category_data["kind"] == "pizza":
            category = categories_by_code[category_data["id"]]
            sync_pizza_category_prices(db, category, category_data["prices"])
            seeded_prices += len(category_data["prices"])

            for index, item in enumerate(category_data["items"], start=1):
                upsert_product(
                    db,
                    category=category,
                    code=item["id"],
                    name=item["name"],
                    description=item["description"],
                    image_ref=item.get("imageKey"),
                    badge_text=item.get("badge"),
                    is_featured=bool(item.get("popular")),
                    sort_order=index,
                )
                seeded_products += 1
        else:
            for group in category_data["groups"]:
                category = categories_by_code[DRINK_GROUP_TO_CATEGORY_CODE[group["name"]]]

                for index, item in enumerate(group["items"], start=1):
                    product = upsert_product(
                        db,
                        category=category,
                        code=item["id"],
                        name=item["name"],
                        description=build_seed_drink_description(group["name"], item["variants"]),
                        image_ref=item.get("imageKey"),
                        badge_text=None,
                        is_featured=False,
                        sort_order=index,
                    )
                    seeded_products += 1

                    for option_index, variant in enumerate(item["variants"], start=1):
                        upsert_product_option(
                            db,
                            product=product,
                            code=variant["id"],
                            label=variant["label"],
                            price=Decimal(str(variant["price"])),
                            sort_order=option_index,
                        )
                        seeded_options += 1

    db.commit()
    return {
        "categories": len(categories_by_code),
        "products": seeded_products,
        "options": seeded_options,
        "pizza_prices": seeded_prices,
    }


def build_public_menu(db: Session) -> dict[str, Any]:
    seed = deepcopy(load_menu_seed())
    categories = db.scalars(select(Category)).all()
    products = db.scalars(select(Product).order_by(Product.sort_order, Product.id)).all()
    options = db.scalars(select(ProductOption).order_by(ProductOption.sort_order, ProductOption.id)).all()
    pizza_prices = db.scalars(select(PizzaCategoryPrice)).all()

    categories_by_code = {category.code: category for category in categories}
    products_by_code = {product.code: product for product in products}
    products_by_category: dict[int, list[Product]] = {}
    for product in products:
        products_by_category.setdefault(product.category_id, []).append(product)

    options_by_product_id: dict[int, list[ProductOption]] = {}
    for option in options:
        options_by_product_id.setdefault(option.product_id, []).append(option)

    prices_by_category: dict[int, dict[str, float]] = {}
    for price in pizza_prices:
        prices_by_category.setdefault(price.category_id, {})[price.size.value] = float(price.price)

    remapped_categories: list[dict[str, Any]] = []
    for category_data in seed["categories"]:
        if category_data["kind"] == "pizza":
            category = categories_by_code[category_data["id"]]
            category_products = products_by_category.get(category.id, [])
            remapped_categories.append(
                build_public_pizza_category(
                    seed_category=category_data,
                    category=category,
                    category_products=category_products,
                    products_by_code=products_by_code,
                    prices=prices_by_category.get(category.id, category_data["prices"]),
                )
            )
            continue

        remapped_categories.append(
            build_public_drink_category(
                seed_category=category_data,
                categories_by_code=categories_by_code,
                products_by_category=products_by_category,
                products_by_code=products_by_code,
                options_by_product_id=options_by_product_id,
            )
        )

    seed["categories"] = remapped_categories
    return seed


def build_public_pizza_category(
    *,
    seed_category: dict[str, Any],
    category: Category,
    category_products: list[Product],
    products_by_code: dict[str, Product],
    prices: dict[str, float] | dict[str, int],
) -> dict[str, Any]:
    visible_items: list[dict[str, Any]] = []
    consumed_codes: set[str] = set()

    for item in seed_category["items"]:
        product = products_by_code.get(item["id"])

        if product is None:
            visible_items.append(item)
            continue

        if product.category_id != category.id or not product.is_active:
            continue

        consumed_codes.add(product.code)
        visible_items.append(product_to_seed_pizza_item(product, fallback_image=item.get("imageKey")))

    extra_products = [
        product
        for product in category_products
        if product.is_active and product.code not in consumed_codes
    ]
    extra_products.sort(key=lambda product: (product.sort_order, product.id))
    visible_items.extend(product_to_seed_pizza_item(product) for product in extra_products)

    return {
        "id": seed_category["id"],
        "label": seed_category["label"],
        "kind": "pizza",
        "prices": {
            "M": numeric_to_json(prices.get("M")),
            "G": numeric_to_json(prices.get("G")),
            "GG": numeric_to_json(prices.get("GG")),
        },
        "items": visible_items,
    }


def build_public_drink_category(
    *,
    seed_category: dict[str, Any],
    categories_by_code: dict[str, Category],
    products_by_category: dict[int, list[Product]],
    products_by_code: dict[str, Product],
    options_by_product_id: dict[int, list[ProductOption]],
) -> dict[str, Any]:
    groups_output: list[dict[str, Any]] = []

    for group in seed_category["groups"]:
        category = categories_by_code[DRINK_GROUP_TO_CATEGORY_CODE[group["name"]]]
        category_products = products_by_category.get(category.id, [])
        consumed_codes: set[str] = set()
        items_output: list[dict[str, Any]] = []

        for item in group["items"]:
            product = products_by_code.get(item["id"])

            if product is None:
                items_output.append(item)
                continue

            if product.category_id != category.id or not product.is_active:
                continue

            consumed_codes.add(product.code)
            items_output.append(
                product_to_seed_drink_item(
                    product,
                    options_by_product_id.get(product.id, []),
                    fallback_image=item.get("imageKey"),
                )
            )

        extra_products = [
            product
            for product in category_products
            if product.is_active and product.code not in consumed_codes
        ]
        extra_products.sort(key=lambda product: (product.sort_order, product.id))
        items_output.extend(
            product_to_seed_drink_item(product, options_by_product_id.get(product.id, []))
            for product in extra_products
        )

        groups_output.append(
            {
                "name": group["name"],
                "items": items_output,
            }
        )

    return {
        "id": seed_category["id"],
        "label": seed_category["label"],
        "kind": "drink",
        "groups": groups_output,
    }


def product_to_seed_pizza_item(product: Product, fallback_image: str | None = None) -> dict[str, Any]:
    item = {
        "id": product.code,
        "name": product.name,
        "description": product.description or "",
        "imageKey": product.image_url or fallback_image or "mussarela",
    }

    if product.is_featured:
        item["popular"] = True
    if product.badge_text:
        item["badge"] = product.badge_text

    return item


def product_to_seed_drink_item(
    product: Product,
    options: list[ProductOption],
    fallback_image: str | None = None,
) -> dict[str, Any]:
    active_options = [option for option in options if option.is_active]
    active_options.sort(key=lambda option: (option.sort_order, option.id))

    if not active_options:
        active_options = options

    return {
        "id": product.code,
        "name": product.name,
        "imageKey": product.image_url or fallback_image or "drink-cola",
        "variants": [
            {
                "id": option.code,
                "label": option.label,
                "price": numeric_to_json(option.price),
            }
            for option in active_options
        ],
    }


def sync_pizza_category_prices(db: Session, category: Category, prices: dict[str, Any]) -> None:
    existing_rows = db.scalars(
        select(PizzaCategoryPrice).where(PizzaCategoryPrice.category_id == category.id)
    ).all()
    rows_by_size = {row.size.value: row for row in existing_rows}

    for size, price in prices.items():
        row = rows_by_size.get(size)
        decimal_price = Decimal(str(price))

        if row is None:
            db.add(
                PizzaCategoryPrice(
                    category_id=category.id,
                    size=size,
                    price=decimal_price,
                )
            )
            continue

        row.price = decimal_price
        db.add(row)


def upsert_product(
    db: Session,
    *,
    category: Category,
    code: str,
    name: str,
    description: str | None,
    image_ref: str | None,
    badge_text: str | None,
    is_featured: bool,
    sort_order: int,
) -> Product:
    product = db.scalar(select(Product).where(Product.code == code))

    if product is None:
        product = Product(
            category_id=category.id,
            code=code,
            name=name,
            description=description,
            image_url=image_ref,
            badge_text=badge_text,
            is_featured=is_featured,
            is_active=True,
            sort_order=sort_order,
        )
    else:
        product.category_id = category.id
        product.name = name
        product.description = description
        product.image_url = image_ref
        product.badge_text = badge_text
        product.is_featured = is_featured
        product.sort_order = sort_order

    db.add(product)
    db.flush()
    return product


def upsert_product_option(
    db: Session,
    *,
    product: Product,
    code: str,
    label: str,
    price: Decimal,
    sort_order: int,
) -> ProductOption:
    option = db.scalar(
        select(ProductOption).where(
            ProductOption.product_id == product.id,
            ProductOption.code == code,
        )
    )

    if option is None:
        option = ProductOption(
            product_id=product.id,
            code=code,
            label=label,
            price=price,
            is_active=True,
            sort_order=sort_order,
        )
    else:
        option.label = label
        option.price = price
        option.sort_order = sort_order

    db.add(option)
    db.flush()
    return option


def build_seed_drink_description(group_name: str, variants: list[dict[str, Any]]) -> str:
    labels = [variant["label"] for variant in variants]

    if group_name == "Sucos":
        return "Preparado na versao com leite ou sem leite."

    if len(labels) == 1 and labels[0] == "Unidade":
        return "Disponivel por unidade."

    if len(labels) == 1:
        return f"Disponivel em {labels[0]}."

    if len(labels) == 2:
        return f"Disponivel em {labels[0]} e {labels[1]}."

    return f"Disponivel em {', '.join(labels[:-1])} e {labels[-1]}."


def numeric_to_json(value: Decimal | float | int | None) -> float | int:
    if value is None:
        return 0

    numeric = float(value)
    return int(numeric) if numeric.is_integer() else numeric
