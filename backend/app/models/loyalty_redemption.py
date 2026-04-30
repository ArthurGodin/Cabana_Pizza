from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class LoyaltyRedemption(TimestampMixin, Base):
    __tablename__ = "loyalty_redemptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    customer_name: Mapped[str | None] = mapped_column(String(120))
    pizza_name: Mapped[str | None] = mapped_column(String(140))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), index=True)
    redeemed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"), index=True)
    note: Mapped[str | None] = mapped_column(Text)

    order: Mapped["Order | None"] = relationship()
    redeemed_by_admin: Mapped["AdminUser | None"] = relationship()
