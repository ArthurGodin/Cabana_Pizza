from __future__ import annotations

from decimal import Decimal
import re
import unicodedata

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Category, CrustFlavor, CrustPrice, PizzaCategoryPrice, Product, ProductOption
from app.models.enums import PizzaSize, ProductType
from app.schemas.admin import (
    AdminCatalogCategoryOutput,
    AdminCreateInitialOptionInput,
    AdminCatalogProductOptionOutput,
    AdminCatalogProductOutput,
    AdminCatalogResponse,
    AdminCrustFlavorOutput,
    AdminCrustFlavorUpdateInput,
    AdminCrustPriceTableOutput,
    AdminCrustPriceTableUpdateInput,
    AdminPizzaBasePriceOutput,
    AdminPizzaBasePriceUpdateInput,
    AdminProductCreateInput,
    AdminProductOptionCreateInput,
    AdminProductOptionUpdateInput,
    AdminProductUpdateInput,
)


def read_admin_catalog(db: Session) -> AdminCatalogResponse:
    categories = db.scalars(
        select(Category)
        .options(selectinload(Category.products).selectinload(Product.options))
        .order_by(Category.sort_order, Category.id)
    ).all()

    pizza_prices = db.scalars(select(PizzaCategoryPrice)).all()
    crust_prices = db.scalars(select(CrustPrice)).all()
    crust_flavors = db.scalars(
        select(CrustFlavor).order_by(CrustFlavor.sort_order, CrustFlavor.id)
    ).all()

    pizza_price_map: dict[int, dict[str, Decimal]] = {}
    for row in pizza_prices:
        pizza_price_map.setdefault(row.category_id, {})[row.size.value] = row.price

    crust_price_map = {row.size.value: row.price for row in crust_prices}

    return AdminCatalogResponse(
        categories=[serialize_catalog_category(category) for category in categories],
        pizzaBasePrices=[
            AdminPizzaBasePriceOutput(
                categoryId=category.id,
                categoryCode=category.code,
                categoryName=category.name,
                prices={
                    "M": pizza_price_map.get(category.id, {}).get("M", Decimal("0.00")),
                    "G": pizza_price_map.get(category.id, {}).get("G", Decimal("0.00")),
                    "GG": pizza_price_map.get(category.id, {}).get("GG", Decimal("0.00")),
                },
            )
            for category in categories
            if category.product_type == ProductType.PIZZA
        ],
        crustPrices=AdminCrustPriceTableOutput(
            M=crust_price_map.get("M", Decimal("0.00")),
            G=crust_price_map.get("G", Decimal("0.00")),
            GG=crust_price_map.get("GG", Decimal("0.00")),
        ),
        crustFlavors=[serialize_crust_flavor(flavor) for flavor in crust_flavors],
    )


def update_admin_product(
    db: Session,
    *,
    product_id: int,
    payload: AdminProductUpdateInput,
) -> AdminCatalogProductOutput:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.options))
        .where(Product.id == product_id)
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto nao encontrado.",
        )

    changes = payload.model_dump(exclude_unset=True, by_alias=False)
    if not changes:
        return serialize_catalog_product(product)

    if "name" in changes:
        product.name = changes["name"]
    if "description" in changes:
        product.description = normalize_optional_text(changes["description"])
    if "image_key" in changes:
        product.image_url = normalize_optional_text(changes["image_key"])
    if "badge_text" in changes:
        product.badge_text = normalize_optional_text(changes["badge_text"])
    if "is_featured" in changes:
        product.is_featured = changes["is_featured"]
    if "is_active" in changes:
        product.is_active = changes["is_active"]
    if "sort_order" in changes:
        product.sort_order = changes["sort_order"]

    db.add(product)
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=["category", "options"])
    return serialize_catalog_product(product)


def update_admin_product_option(
    db: Session,
    *,
    option_id: int,
    payload: AdminProductOptionUpdateInput,
) -> AdminCatalogProductOptionOutput:
    option = db.scalar(select(ProductOption).where(ProductOption.id == option_id))

    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opcao do produto nao encontrada.",
        )

    changes = payload.model_dump(exclude_unset=True, by_alias=False)
    if not changes:
        return serialize_product_option(option)

    if "label" in changes:
        option.label = changes["label"]
    if "price" in changes:
        option.price = changes["price"]
    if "is_active" in changes:
        option.is_active = changes["is_active"]
    if "sort_order" in changes:
        option.sort_order = changes["sort_order"]

    db.add(option)
    db.commit()
    db.refresh(option)
    return serialize_product_option(option)


def create_admin_product(
    db: Session,
    payload: AdminProductCreateInput,
) -> AdminCatalogProductOutput:
    category = db.scalar(select(Category).where(Category.code == payload.category_code))

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria nao encontrada para criar o produto.",
        )

    if category.product_type == ProductType.DRINK and payload.initial_option is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bebidas precisam nascer com pelo menos uma opcao de venda.",
        )

    if category.product_type == ProductType.PIZZA and payload.initial_option is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pizzas nao devem ser criadas com opcoes de produto nesta modelagem.",
        )

    product = Product(
        category_id=category.id,
        code=build_unique_product_code(db, payload.code or payload.name),
        name=payload.name,
        description=normalize_optional_text(payload.description),
        image_url=normalize_optional_text(payload.image_key) or default_image_key(category.product_type),
        badge_text=normalize_optional_text(payload.badge_text) if category.product_type == ProductType.PIZZA else None,
        is_featured=payload.is_featured if category.product_type == ProductType.PIZZA else False,
        is_active=payload.is_active,
        sort_order=payload.sort_order if payload.sort_order is not None else next_product_sort_order(db, category.id),
    )
    db.add(product)
    db.flush()

    if payload.initial_option is not None:
        create_product_option_record(
            db,
            product=product,
            payload=payload.initial_option,
        )

    db.commit()
    return load_and_serialize_product(db, product.id)


def create_admin_product_option(
    db: Session,
    payload: AdminProductOptionCreateInput,
) -> AdminCatalogProductOptionOutput:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.options))
        .where(Product.id == payload.product_id)
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto nao encontrado para criar a opcao.",
        )

    if product.category.product_type != ProductType.DRINK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nesta fase, opcoes adicionais so sao usadas para bebidas.",
        )

    option = create_product_option_record(db, product=product, payload=payload)
    db.commit()
    db.refresh(option)
    return serialize_product_option(option)


def update_pizza_base_prices(
    db: Session,
    *,
    category_code: str,
    payload: AdminPizzaBasePriceUpdateInput,
) -> AdminPizzaBasePriceOutput:
    category = db.scalar(select(Category).where(Category.code == category_code))

    if category is None or category.product_type != ProductType.PIZZA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria de pizza nao encontrada.",
        )

    existing_rows = db.scalars(
        select(PizzaCategoryPrice).where(PizzaCategoryPrice.category_id == category.id)
    ).all()
    rows_by_size = {row.size.value: row for row in existing_rows}
    incoming = {
        "M": payload.price_m,
        "G": payload.price_g,
        "GG": payload.price_gg,
    }

    for size_key, price in incoming.items():
        row = rows_by_size.get(size_key)

        if row is None:
            row = PizzaCategoryPrice(
                category_id=category.id,
                size=PizzaSize(size_key),
                price=price,
            )
        else:
            row.price = price

        db.add(row)

    db.commit()

    return AdminPizzaBasePriceOutput(
        categoryId=category.id,
        categoryCode=category.code,
        categoryName=category.name,
        prices=incoming,
    )


def update_crust_price_table(
    db: Session,
    payload: AdminCrustPriceTableUpdateInput,
) -> AdminCrustPriceTableOutput:
    existing_rows = db.scalars(select(CrustPrice)).all()
    rows_by_size = {row.size.value: row for row in existing_rows}
    incoming = {
        "M": payload.price_m,
        "G": payload.price_g,
        "GG": payload.price_gg,
    }

    for size_key, price in incoming.items():
        row = rows_by_size.get(size_key)

        if row is None:
            row = CrustPrice(size=PizzaSize(size_key), price=price)
        else:
            row.price = price

        db.add(row)

    db.commit()
    return AdminCrustPriceTableOutput(**incoming)


def update_crust_flavor(
    db: Session,
    *,
    crust_flavor_id: int,
    payload: AdminCrustFlavorUpdateInput,
) -> AdminCrustFlavorOutput:
    crust_flavor = db.scalar(select(CrustFlavor).where(CrustFlavor.id == crust_flavor_id))

    if crust_flavor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sabor de borda nao encontrado.",
        )

    changes = payload.model_dump(exclude_unset=True, by_alias=False)
    if not changes:
        return serialize_crust_flavor(crust_flavor)

    if "name" in changes:
        crust_flavor.name = changes["name"]
    if "description" in changes:
        crust_flavor.description = normalize_optional_text(changes["description"])
    if "is_active" in changes:
        crust_flavor.is_active = changes["is_active"]
    if "sort_order" in changes:
        crust_flavor.sort_order = changes["sort_order"]

    db.add(crust_flavor)
    db.commit()
    db.refresh(crust_flavor)
    return serialize_crust_flavor(crust_flavor)


def serialize_catalog_category(category: Category) -> AdminCatalogCategoryOutput:
    products = sorted(category.products, key=lambda item: (item.sort_order, item.id))
    return AdminCatalogCategoryOutput(
        id=category.id,
        code=category.code,
        name=category.name,
        productType=category.product_type,
        isActive=category.is_active,
        sortOrder=category.sort_order,
        products=[serialize_catalog_product(product, category_override=category) for product in products],
    )


def serialize_catalog_product(
    product: Product,
    *,
    category_override: Category | None = None,
) -> AdminCatalogProductOutput:
    category = category_override or product.category
    options = sorted(product.options, key=lambda item: (item.sort_order, item.id))
    return AdminCatalogProductOutput(
        id=product.id,
        categoryCode=category.code,
        categoryName=category.name,
        productType=category.product_type,
        code=product.code,
        name=product.name,
        description=product.description,
        imageKey=product.image_url,
        badgeText=product.badge_text,
        isFeatured=product.is_featured,
        isActive=product.is_active,
        sortOrder=product.sort_order,
        options=[serialize_product_option(option) for option in options],
    )


def serialize_product_option(option: ProductOption) -> AdminCatalogProductOptionOutput:
    return AdminCatalogProductOptionOutput(
        id=option.id,
        code=option.code,
        label=option.label,
        price=option.price,
        isActive=option.is_active,
        sortOrder=option.sort_order,
    )


def serialize_crust_flavor(crust_flavor: CrustFlavor) -> AdminCrustFlavorOutput:
    return AdminCrustFlavorOutput(
        id=crust_flavor.id,
        code=crust_flavor.code,
        name=crust_flavor.name,
        description=crust_flavor.description,
        isActive=crust_flavor.is_active,
        sortOrder=crust_flavor.sort_order,
    )


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def load_and_serialize_product(db: Session, product_id: int) -> AdminCatalogProductOutput:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.options))
        .where(Product.id == product_id)
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto nao encontrado apos a criacao.",
        )

    return serialize_catalog_product(product)


def build_unique_product_code(db: Session, raw_value: str) -> str:
    base = slugify_code(raw_value)
    candidate = base
    suffix = 2

    while db.scalar(select(Product.id).where(Product.code == candidate)) is not None:
        candidate = f"{base}-{suffix}"
        suffix += 1

    return candidate


def build_unique_option_code(db: Session, *, product_id: int, raw_value: str) -> str:
    base = slugify_code(raw_value)
    candidate = base
    suffix = 2

    while db.scalar(
        select(ProductOption.id).where(
            ProductOption.product_id == product_id,
            ProductOption.code == candidate,
        )
    ) is not None:
        candidate = f"{base}-{suffix}"
        suffix += 1

    return candidate


def next_product_sort_order(db: Session, category_id: int) -> int:
    current_max = db.scalar(select(func.max(Product.sort_order)).where(Product.category_id == category_id))
    return (current_max or 0) + 1


def next_option_sort_order(db: Session, product_id: int) -> int:
    current_max = db.scalar(select(func.max(ProductOption.sort_order)).where(ProductOption.product_id == product_id))
    return (current_max or 0) + 1


def create_product_option_record(
    db: Session,
    *,
    product: Product,
    payload: AdminCreateInitialOptionInput | AdminProductOptionCreateInput,
) -> ProductOption:
    option = ProductOption(
        product_id=product.id,
        code=build_unique_option_code(db, product_id=product.id, raw_value=payload.code or payload.label),
        label=payload.label,
        price=payload.price,
        is_active=payload.is_active,
        sort_order=payload.sort_order if payload.sort_order is not None else next_option_sort_order(db, product.id),
    )
    db.add(option)
    db.flush()
    return option


def slugify_code(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_value.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    return slug or "item"


def default_image_key(product_type: ProductType) -> str:
    return "mussarela" if product_type == ProductType.PIZZA else "drink-cola"
