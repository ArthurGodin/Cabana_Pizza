from __future__ import annotations

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import OrderStatus, enum_values
from app.models.mixins import TimestampMixin


class OrderEvent(TimestampMixin, Base):
    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    admin_user_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    previous_status: Mapped[OrderStatus | None] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", values_callable=enum_values),
        nullable=True,
    )
    next_status: Mapped[OrderStatus | None] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", values_callable=enum_values),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(Text)

    order: Mapped["Order"] = relationship(back_populates="events")
    admin_user: Mapped["AdminUser | None"] = relationship(back_populates="order_events")
