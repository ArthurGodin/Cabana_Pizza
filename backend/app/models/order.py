from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Enum, Integer, Numeric, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FulfillmentType, OrderChannel, OrderStatus, PaymentMethod, enum_values
from app.models.mixins import TimestampMixin


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", values_callable=enum_values),
        nullable=False,
        server_default=OrderStatus.PENDING.value,
    )
    previous_status: Mapped[OrderStatus | None] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", values_callable=enum_values),
        nullable=True,
    )
    status_changed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    channel: Mapped[OrderChannel] = mapped_column(
        Enum(OrderChannel, name="order_channel_enum", values_callable=enum_values),
        nullable=False,
        server_default=OrderChannel.SITE.value,
    )
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    fulfillment_type: Mapped[FulfillmentType] = mapped_column(
        Enum(FulfillmentType, name="fulfillment_type_enum", values_callable=enum_values),
        nullable=False,
    )
    postal_code: Mapped[str | None] = mapped_column(String(9))
    neighborhood: Mapped[str | None] = mapped_column(String(120))
    street: Mapped[str | None] = mapped_column(String(180))
    number: Mapped[str | None] = mapped_column(String(40))
    city: Mapped[str | None] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(8))
    complement: Mapped[str | None] = mapped_column(String(120))
    reference: Mapped[str | None] = mapped_column(Text)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum", values_callable=enum_values),
        nullable=False,
    )
    change_for: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        server_default=text("0"),
    )
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["OrderEvent"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )
