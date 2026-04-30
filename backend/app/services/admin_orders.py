from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.admin_user import AdminUser
from app.models.enums import FulfillmentType, OrderStatus
from app.models.order import Order
from app.models.order_event import OrderEvent
from app.schemas.admin import (
    AdminOrderEventOutput,
    AdminOrderItemOutput,
    AdminOrderListItemOutput,
    AdminOrdersDashboardResponse,
)

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def list_recent_orders(
    db: Session,
    *,
    limit: int = 20,
    status: OrderStatus | None = None,
    fulfillment: FulfillmentType | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[AdminOrderListItemOutput]:
    query = apply_order_filters(
        select(Order).options(selectinload(Order.items), selectinload(Order.events).selectinload(OrderEvent.admin_user)),
        status=status,
        fulfillment=fulfillment,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )

    orders = db.scalars(
        query.order_by(Order.created_at.desc()).limit(limit)
    ).all()

    return [serialize_order(order) for order in orders]


def get_orders_dashboard(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AdminOrdersDashboardResponse:
    query = apply_order_filters(
        select(Order).options(selectinload(Order.items)),
        date_from=date_from,
        date_to=date_to,
    )
    orders = db.scalars(query).all()

    total_orders = len(orders)
    gross_revenue = sum((order.total for order in orders), Decimal("0"))
    completed_revenue = sum(
        (order.total for order in orders if order.status == OrderStatus.COMPLETED),
        Decimal("0"),
    )
    average_ticket = gross_revenue / total_orders if total_orders else Decimal("0")

    return AdminOrdersDashboardResponse(
        totalOrders=total_orders,
        pendingOrders=count_by_status(orders, OrderStatus.PENDING),
        confirmedOrders=count_by_status(orders, OrderStatus.CONFIRMED),
        preparingOrders=count_by_status(orders, OrderStatus.PREPARING),
        outForDeliveryOrders=count_by_status(orders, OrderStatus.OUT_FOR_DELIVERY),
        completedOrders=count_by_status(orders, OrderStatus.COMPLETED),
        cancelledOrders=count_by_status(orders, OrderStatus.CANCELLED),
        deliveryOrders=sum(1 for order in orders if order.fulfillment_type == FulfillmentType.DELIVERY),
        pickupOrders=sum(1 for order in orders if order.fulfillment_type == FulfillmentType.PICKUP),
        grossRevenue=gross_revenue,
        completedRevenue=completed_revenue,
        averageTicket=average_ticket,
        topProducts=build_top_products(orders),
        topNeighborhoods=build_top_neighborhoods(orders),
        busyHours=build_busy_hours(orders),
    )


def update_order_status(
    db: Session,
    *,
    order_id: int,
    next_status: OrderStatus,
    current_admin: AdminUser,
) -> AdminOrderListItemOutput:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.events).selectinload(OrderEvent.admin_user))
        .where(Order.id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido nao encontrado.",
        )

    if order.status == next_status:
        return serialize_order(order)

    if not is_valid_status_transition(order.status, next_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nao e permitido mover um pedido de {order.status.value} para {next_status.value}.",
        )

    previous_status = order.status
    order.previous_status = previous_status
    order.status = next_status
    order.status_changed_at = utcnow()
    db.add(order)
    db.add(
        build_order_event(
            order=order,
            current_admin=current_admin,
            event_type="status_changed",
            previous_status=previous_status,
            next_status=next_status,
        )
    )
    db.commit()
    db.refresh(order)
    db.refresh(order, attribute_names=["items", "events"])
    return serialize_order(order)


def undo_order_status_change(
    db: Session,
    *,
    order_id: int,
    current_admin: AdminUser,
) -> AdminOrderListItemOutput:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.events).selectinload(OrderEvent.admin_user))
        .where(Order.id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido nao encontrado.",
        )

    if not can_undo_status_change(order):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao ha mudanca recente de status disponivel para desfazer.",
        )

    if order.previous_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido nao possui status anterior registrado.",
        )

    previous_status = order.status
    restored_status = order.previous_status
    order.status = restored_status
    order.previous_status = None
    order.status_changed_at = utcnow()
    db.add(order)
    db.add(
        build_order_event(
            order=order,
            current_admin=current_admin,
            event_type="status_undone",
            previous_status=previous_status,
            next_status=restored_status,
        )
    )
    db.commit()
    db.refresh(order)
    db.refresh(order, attribute_names=["items", "events"])
    return serialize_order(order)


def serialize_order(order: Order) -> AdminOrderListItemOutput:
    return AdminOrderListItemOutput(
        id=order.id,
        publicId=order.public_id,
        status=order.status,
        previousStatus=order.previous_status,
        canUndoStatusChange=can_undo_status_change(order),
        statusChangedAt=order.status_changed_at,
        customerName=order.customer_name,
        customerPhone=order.customer_phone,
        fulfillmentType=order.fulfillment_type,
        paymentMethod=order.payment_method,
        changeFor=order.change_for,
        postalCode=order.postal_code,
        neighborhood=order.neighborhood,
        street=order.street,
        number=order.number,
        city=order.city,
        state=order.state,
        complement=order.complement,
        reference=order.reference,
        subtotal=order.subtotal,
        deliveryFee=order.delivery_fee,
        total=order.total,
        notes=order.notes,
        createdAt=order.created_at,
        itemCount=sum(item.quantity for item in order.items),
        items=[
            AdminOrderItemOutput(
                id=item.id,
                productName=item.product_name,
                productOptionLabel=item.product_option_label,
                pizzaSize=item.pizza_size.value if item.pizza_size else None,
                crustName=item.crust_name,
                note=item.note,
                unitPrice=item.unit_price,
                quantity=item.quantity,
                lineTotal=item.line_total,
            )
            for item in sorted(order.items, key=lambda current: current.sort_order)
        ],
        events=[
            AdminOrderEventOutput(
                id=event.id,
                eventType=event.event_type,
                previousStatus=event.previous_status,
                nextStatus=event.next_status,
                adminUserId=event.admin_user_id,
                adminUserName=event.admin_user.name if event.admin_user else None,
                note=event.note,
                createdAt=event.created_at,
            )
            for event in sorted(order.events, key=lambda current: current.created_at)
        ],
    )


def build_order_event(
    *,
    order: Order,
    current_admin: AdminUser,
    event_type: str,
    previous_status: OrderStatus | None,
    next_status: OrderStatus | None,
) -> OrderEvent:
    return OrderEvent(
        order=order,
        admin_user_id=current_admin.id,
        event_type=event_type,
        previous_status=previous_status,
        next_status=next_status,
    )


def apply_order_filters(
    query,
    *,
    status: OrderStatus | None = None,
    fulfillment: FulfillmentType | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    if status is not None:
        query = query.where(Order.status == status)

    if fulfillment is not None:
        query = query.where(Order.fulfillment_type == fulfillment)

    if date_from is not None:
        query = query.where(Order.created_at >= start_of_local_day(date_from))

    if date_to is not None:
        query = query.where(Order.created_at <= end_of_local_day(date_to))

    normalized_search = (search or "").strip()
    if normalized_search:
        term = f"%{normalized_search}%"
        query = query.where(
            or_(
                Order.customer_name.ilike(term),
                Order.customer_phone.ilike(term),
                cast(Order.public_id, String).ilike(term),
            )
        )

    return query


def count_by_status(orders: list[Order], status: OrderStatus) -> int:
    return sum(1 for order in orders if order.status == status)


def build_top_products(orders: list[Order]) -> list[dict[str, int | str]]:
    totals: dict[str, int] = {}

    for order in orders:
        if order.status == OrderStatus.CANCELLED:
            continue

        for item in order.items:
            totals[item.product_name] = totals.get(item.product_name, 0) + item.quantity

    return build_rank_output(totals, limit=5)


def build_top_neighborhoods(orders: list[Order]) -> list[dict[str, int | str]]:
    totals: dict[str, int] = {}

    for order in orders:
        if order.status == OrderStatus.CANCELLED or order.fulfillment_type != FulfillmentType.DELIVERY:
            continue

        label = (order.neighborhood or "Bairro nao informado").strip()
        totals[label] = totals.get(label, 0) + 1

    return build_rank_output(totals, limit=5)


def build_busy_hours(orders: list[Order]) -> list[dict[str, int | str]]:
    totals: dict[str, int] = {}

    for order in orders:
        if order.status == OrderStatus.CANCELLED:
            continue

        local_hour = order.created_at.astimezone(SAO_PAULO_TZ).hour
        label = f"{local_hour:02d}:00"
        totals[label] = totals.get(label, 0) + 1

    return build_rank_output(totals, limit=5)


def build_rank_output(totals: dict[str, int], *, limit: int) -> list[dict[str, int | str]]:
    ranked_items = sorted(
        totals.items(),
        key=lambda item: (-item[1], item[0].lower()),
    )
    return [
        {
            "label": label,
            "value": value,
        }
        for label, value in ranked_items[:limit]
    ]


def start_of_local_day(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=SAO_PAULO_TZ)


def end_of_local_day(value: date) -> datetime:
    return datetime.combine(value, time.max, tzinfo=SAO_PAULO_TZ)


def is_valid_status_transition(current_status: OrderStatus, next_status: OrderStatus) -> bool:
    allowed_transitions = {
        OrderStatus.PENDING: {
            OrderStatus.CONFIRMED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.CONFIRMED: {
            OrderStatus.PREPARING,
            OrderStatus.CANCELLED,
        },
        OrderStatus.PREPARING: {
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.OUT_FOR_DELIVERY: {
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.COMPLETED: set(),
        OrderStatus.CANCELLED: set(),
    }

    return next_status in allowed_transitions[current_status]


def can_undo_status_change(order: Order) -> bool:
    if order.previous_status is None or order.status_changed_at is None:
        return False

    window = timedelta(minutes=get_settings().admin_order_undo_window_minutes)
    return utcnow() - order.status_changed_at <= window


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
