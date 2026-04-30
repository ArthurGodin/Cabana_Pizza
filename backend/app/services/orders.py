from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, CrustPrice, PizzaCategoryPrice, Product, ProductOption
from app.models.crust_flavor import CrustFlavor
from app.models.enums import PizzaSize, ProductType
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreateInput, OrderItemInput

ZERO = Decimal("0.00")


@dataclass(frozen=True)
class ResolvedOrderItem:
    product: Product
    product_option: ProductOption | None
    pizza_size: PizzaSize | None
    crust_flavor: CrustFlavor | None
    crust_name: str | None
    crust_price: Decimal | None
    note: str | None
    unit_price: Decimal
    quantity: int
    line_total: Decimal


def create_order(db: Session, payload: OrderCreateInput) -> Order:
    resolved_items = [
        resolve_order_item(db=db, item=item)
        for item in payload.items
    ]
    subtotal = quantize(sum((item.line_total for item in resolved_items), ZERO))
    delivery_fee = ZERO
    total = quantize(subtotal + delivery_fee)

    order = Order(
        channel=payload.channel,
        customer_name=payload.customer.name,
        customer_phone=payload.customer.phone,
        fulfillment_type=payload.fulfillment.type,
        postal_code=payload.fulfillment.postal_code,
        neighborhood=payload.fulfillment.neighborhood,
        street=payload.fulfillment.street,
        number=payload.fulfillment.number,
        city=payload.fulfillment.city,
        state=payload.fulfillment.state,
        complement=payload.fulfillment.complement,
        reference=payload.fulfillment.reference,
        payment_method=payload.payment.method,
        change_for=payload.payment.change_for,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        notes=payload.notes,
    )

    for index, item in enumerate(resolved_items, start=1):
        order.items.append(build_order_item(item=item, sort_order=index))

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def build_order_item(
    *,
    item: ResolvedOrderItem,
    sort_order: int,
) -> OrderItem:
    return OrderItem(
        product_id=item.product.id,
        product_option_id=item.product_option.id if item.product_option else None,
        product_code=item.product.code,
        product_name=item.product.name,
        product_option_label=item.product_option.label if item.product_option else None,
        pizza_size=item.pizza_size,
        crust_flavor_id=item.crust_flavor.id if item.crust_flavor else None,
        crust_name=item.crust_name,
        crust_price=item.crust_price,
        note=item.note,
        unit_price=quantize(item.unit_price),
        quantity=item.quantity,
        line_total=item.line_total,
        sort_order=sort_order,
    )


def resolve_order_item(*, db: Session, item: OrderItemInput) -> ResolvedOrderItem:
    product = load_active_product(db, item.product_id)

    if product.category.product_type == ProductType.PIZZA:
        return resolve_pizza_item(db=db, product=product, item=item)

    if product.category.product_type == ProductType.DRINK:
        return resolve_drink_item(db=db, product=product, item=item)

    raise ValueError("Tipo de produto invalido no cardapio.")


def resolve_pizza_item(*, db: Session, product: Product, item: OrderItemInput) -> ResolvedOrderItem:
    pizza_size = parse_pizza_size(item.size)
    if pizza_size is None:
        raise ValueError(f"Tamanho invalido para {product.name}.")

    base_price = load_pizza_base_price(db, product.category_id, pizza_size)
    crust_flavor = None
    crust_name = None
    crust_price = None

    if item.edge and item.edge.id != "none":
        crust_flavor = load_active_crust_flavor(db, item.edge.id)
        crust_price = load_crust_price(db, pizza_size)
        crust_name = crust_flavor.name

    unit_price = quantize(base_price + (crust_price or ZERO))

    return ResolvedOrderItem(
        product=product,
        product_option=None,
        pizza_size=pizza_size,
        crust_flavor=crust_flavor,
        crust_name=crust_name,
        crust_price=crust_price,
        note=item.note,
        unit_price=unit_price,
        quantity=item.qty,
        line_total=quantize(unit_price * item.qty),
    )


def resolve_drink_item(*, db: Session, product: Product, item: OrderItemInput) -> ResolvedOrderItem:
    product_option = load_active_product_option(db, product, item.size)
    unit_price = quantize(product_option.price)

    return ResolvedOrderItem(
        product=product,
        product_option=product_option,
        pizza_size=None,
        crust_flavor=None,
        crust_name=None,
        crust_price=None,
        note=item.note,
        unit_price=unit_price,
        quantity=item.qty,
        line_total=quantize(unit_price * item.qty),
    )


def load_active_product(db: Session, product_code: str) -> Product:
    product = db.scalar(
        select(Product)
        .join(Category)
        .where(Product.code == product_code)
        .where(Product.is_active.is_(True))
        .where(Category.is_active.is_(True))
    )

    if product is None:
        raise ValueError("Produto indisponivel ou fora do cardapio atual.")

    return product


def load_pizza_base_price(db: Session, category_id: int, size: PizzaSize) -> Decimal:
    price = db.scalar(
        select(PizzaCategoryPrice)
        .where(PizzaCategoryPrice.category_id == category_id)
        .where(PizzaCategoryPrice.size == size)
    )

    if price is None:
        raise ValueError("Preco indisponivel para este tamanho de pizza.")

    return quantize(price.price)


def load_crust_price(db: Session, size: PizzaSize) -> Decimal:
    price = db.scalar(select(CrustPrice).where(CrustPrice.size == size))

    if price is None:
        raise ValueError("Preco de borda indisponivel para este tamanho.")

    return quantize(price.price)


def load_active_crust_flavor(db: Session, crust_code: str) -> CrustFlavor:
    crust = db.scalar(
        select(CrustFlavor)
        .where(CrustFlavor.code == crust_code)
        .where(CrustFlavor.is_active.is_(True))
    )

    if crust is None:
        raise ValueError("Borda indisponivel no cardapio atual.")

    return crust


def load_active_product_option(db: Session, product: Product, selected_label: str) -> ProductOption:
    options = db.scalars(
        select(ProductOption)
        .where(ProductOption.product_id == product.id)
        .where(ProductOption.is_active.is_(True))
        .order_by(ProductOption.sort_order, ProductOption.id)
    ).all()

    if not options:
        raise ValueError(f"{product.name} esta sem opcao de venda ativa.")

    normalized_label = normalize_text(selected_label)
    matching_option = next(
        (option for option in options if normalize_text(option.label) == normalized_label),
        None,
    )

    if matching_option:
        return matching_option

    if len(options) == 1:
        return options[0]

    raise ValueError(f"Opcao invalida para {product.name}.")


def quantize(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_pizza_size(value: str) -> PizzaSize | None:
    normalized = value.strip().upper()
    if normalized in PizzaSize.__members__:
        return PizzaSize[normalized]
    return None


def normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())
