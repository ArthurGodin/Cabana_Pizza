from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import LoyaltyRedemption, Order, OrderItem
from app.models.admin_user import AdminUser
from app.models.enums import OrderStatus
from app.schemas.loyalty import (
    LoyaltyRedemptionCreateInput,
    LoyaltyRedemptionCreateResponse,
    LoyaltyRedemptionOutput,
    LoyaltySummaryOutput,
)

REWARD_STEP = 10


def read_loyalty_summary(db: Session, phone: str, customer_name: str | None = None) -> LoyaltySummaryOutput:
    normalized_phone = normalize_phone(phone)
    if len(normalized_phone) < 8:
        raise ValueError("Informe um telefone valido para consultar a fidelidade.")

    qualifying_pizzas = count_qualifying_pizzas(db, normalized_phone)
    redeemed_rewards = count_redeemed_rewards(db, normalized_phone)
    earned_rewards = qualifying_pizzas // REWARD_STEP
    available_rewards = max(earned_rewards - redeemed_rewards, 0)
    progress_count = qualifying_pizzas % REWARD_STEP
    pizzas_until_next = 0 if available_rewards > 0 else REWARD_STEP - progress_count

    return LoyaltySummaryOutput(
        customerPhone=normalized_phone,
        customerName=customer_name or find_latest_customer_name(db, normalized_phone),
        qualifyingPizzas=qualifying_pizzas,
        redeemedRewards=redeemed_rewards,
        earnedRewards=earned_rewards,
        availableRewards=available_rewards,
        progressCount=progress_count,
        pizzasUntilNextReward=pizzas_until_next,
    )


def list_loyalty_customers(
    db: Session,
    *,
    search: str | None = None,
    limit: int = 50,
) -> list[LoyaltySummaryOutput]:
    query = (
        select(
            Order.customer_phone,
            func.max(Order.customer_name),
            func.coalesce(func.sum(OrderItem.quantity), 0),
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .where(Order.status == OrderStatus.COMPLETED)
        .where(OrderItem.pizza_size.is_not(None))
        .group_by(Order.customer_phone)
        .order_by(desc(func.coalesce(func.sum(OrderItem.quantity), 0)))
        .limit(limit)
    )

    normalized_search = normalize_phone(search or "")
    text_search = (search or "").strip()
    if text_search:
        query = query.where(
            Order.customer_phone.ilike(f"%{normalized_search or text_search}%")
            | Order.customer_name.ilike(f"%{text_search}%")
        )

    rows = db.execute(query).all()
    return [
        read_loyalty_summary(db, phone, customer_name=name)
        for phone, name, _count in rows
        if phone
    ]


def create_loyalty_redemption(
    db: Session,
    *,
    payload: LoyaltyRedemptionCreateInput,
    current_admin: AdminUser,
) -> LoyaltyRedemptionCreateResponse:
    normalized_phone = normalize_phone(payload.customer_phone)
    summary = read_loyalty_summary(db, normalized_phone, customer_name=payload.customer_name)

    if summary.available_rewards <= 0:
        raise ValueError("Este cliente ainda nao possui pizza gratis disponivel para resgate.")

    redemption = LoyaltyRedemption(
        customer_phone=normalized_phone,
        customer_name=payload.customer_name or summary.customer_name,
        pizza_name=payload.pizza_name,
        order_id=payload.order_id,
        redeemed_by_admin_id=current_admin.id,
        note=payload.note,
    )
    db.add(redemption)
    db.commit()
    db.refresh(redemption)

    return LoyaltyRedemptionCreateResponse(
        redemption=LoyaltyRedemptionOutput.model_validate(redemption),
        summary=read_loyalty_summary(db, normalized_phone),
    )


def count_qualifying_pizzas(db: Session, phone: str) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.customer_phone == phone)
        .where(Order.status == OrderStatus.COMPLETED)
        .where(OrderItem.pizza_size.is_not(None))
    )
    return int(total or 0)


def count_redeemed_rewards(db: Session, phone: str) -> int:
    total = db.scalar(
        select(func.count(LoyaltyRedemption.id)).where(LoyaltyRedemption.customer_phone == phone)
    )
    return int(total or 0)


def find_latest_customer_name(db: Session, phone: str) -> str | None:
    return db.scalar(
        select(Order.customer_name)
        .where(Order.customer_phone == phone)
        .order_by(Order.created_at.desc())
        .limit(1)
    )


def normalize_phone(value: str) -> str:
    return "".join(char for char in value if char.isdigit())
