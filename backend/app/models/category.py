from __future__ import annotations

from sqlalchemy import Boolean, Enum, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ProductType, enum_values
from app.models.mixins import TimestampMixin


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    product_type: Mapped[ProductType] = mapped_column(
        Enum(ProductType, name="product_type_enum", values_callable=enum_values),
        index=True,
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    products: Mapped[list["Product"]] = relationship(back_populates="category")
    pizza_prices: Mapped[list["PizzaCategoryPrice"]] = relationship(back_populates="category")
