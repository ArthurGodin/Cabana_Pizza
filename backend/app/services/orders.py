from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.crust_flavor import CrustFlavor
from app.models.enums import PizzaSize
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreateInput, OrderItemInput

ZERO = Decimal("0.00")


def create_order(db: Session, payload: OrderCreateInput) -> Order:
    subtotal = quantize(sum(calculate_item_total(item) for item in payload.items))
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

    crust_codes = {item.edge.id for item in payload.items if item.edge}
    crust_map = load_crust_flavor_map(db, crust_codes)

    for index, item in enumerate(payload.items, start=1):
        order.items.append(build_order_item(item=item, sort_order=index, crust_map=crust_map))

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def build_order_item(
    *,
    item: OrderItemInput,
    sort_order: int,
    crust_map: dict[str, CrustFlavor],
) -> OrderItem:
    pizza_size = parse_pizza_size(item.size)
    product_option_label = None if pizza_size else item.size

    crust_flavor = crust_map.get(item.edge.id) if item.edge else None
    crust_name = item.edge.name if item.edge else None
    crust_price = item.edge.price if item.edge else None
    line_total = calculate_item_total(item)

    return OrderItem(
        product_code=item.product_id,
        product_name=item.name,
        product_option_label=product_option_label,
        pizza_size=pizza_size,
        crust_flavor_id=crust_flavor.id if crust_flavor else None,
        crust_name=crust_name,
        crust_price=crust_price,
        note=item.note,
        unit_price=quantize(item.unit_price),
        quantity=item.qty,
        line_total=line_total,
        sort_order=sort_order,
    )


def calculate_item_total(item: OrderItemInput) -> Decimal:
    return quantize(item.unit_price * item.qty)


def quantize(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_pizza_size(value: str) -> PizzaSize | None:
    normalized = value.strip().upper()
    if normalized in PizzaSize.__members__:
        return PizzaSize[normalized]
    return None


def load_crust_flavor_map(db: Session, crust_codes: set[str]) -> dict[str, CrustFlavor]:
    known_codes = {code for code in crust_codes if code and code != "none"}
    if not known_codes:
        return {}

    rows = db.scalars(select(CrustFlavor).where(CrustFlavor.code.in_(known_codes))).all()
    return {row.code: row for row in rows}
