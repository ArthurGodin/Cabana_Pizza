from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Enum, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import PizzaSize, enum_values
from app.models.mixins import TimestampMixin


class CrustPrice(TimestampMixin, Base):
    __tablename__ = "crust_prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    size: Mapped[PizzaSize] = mapped_column(
        Enum(PizzaSize, name="pizza_size_enum", values_callable=enum_values),
        unique=True,
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
