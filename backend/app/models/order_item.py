from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PizzaSize, enum_values
from app.models.mixins import TimestampMixin


class OrderItem(TimestampMixin, Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True)
    product_option_id: Mapped[int | None] = mapped_column(ForeignKey("product_options.id"), index=True)
    crust_flavor_id: Mapped[int | None] = mapped_column(ForeignKey("crust_flavors.id"), index=True)
    product_code: Mapped[str] = mapped_column(String(80), nullable=False)
    product_name: Mapped[str] = mapped_column(String(140), nullable=False)
    product_option_label: Mapped[str | None] = mapped_column(String(120))
    pizza_size: Mapped[PizzaSize | None] = mapped_column(
        Enum(PizzaSize, name="pizza_size_enum", values_callable=enum_values)
    )
    crust_name: Mapped[str | None] = mapped_column(String(100))
    crust_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None] = mapped_column(Text)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship(back_populates="order_items")
    product_option: Mapped["ProductOption | None"] = relationship(back_populates="order_items")
    crust_flavor: Mapped["CrustFlavor | None"] = relationship(back_populates="order_items")
