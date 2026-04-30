from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PizzaSize, enum_values
from app.models.mixins import TimestampMixin


class PizzaCategoryPrice(TimestampMixin, Base):
    __tablename__ = "pizza_category_prices"
    __table_args__ = (
        UniqueConstraint("category_id", "size", name="uq_pizza_category_prices_category_id_size"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)
    size: Mapped[PizzaSize] = mapped_column(
        Enum(PizzaSize, name="pizza_size_enum", values_callable=enum_values),
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    category: Mapped["Category"] = relationship(back_populates="pizza_prices")
