from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import FulfillmentType, OrderChannel, OrderStatus, PaymentMethod
from app.schemas.loyalty import LoyaltySummaryOutput

MoneyField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
PositiveQuantityField = Annotated[int, Field(ge=1, le=20)]


class OrderEdgeInput(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=100)
    price: MoneyField


class OrderCustomerInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)

    @field_validator("name", "phone")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class OrderFulfillmentInput(BaseModel):
    type: FulfillmentType
    postal_code: str | None = Field(default=None, alias="postalCode", max_length=9)
    neighborhood: str | None = Field(default=None, max_length=120)
    street: str | None = Field(default=None, max_length=180)
    number: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=8)
    complement: str | None = Field(default=None, max_length=120)
    reference: str | None = Field(default=None, max_length=160)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator(
        "postal_code",
        "neighborhood",
        "street",
        "number",
        "city",
        "state",
        "complement",
        "reference",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class OrderPaymentInput(BaseModel):
    method: PaymentMethod
    change_for: MoneyField | None = Field(default=None, alias="changeFor")

    model_config = ConfigDict(populate_by_name=True)


class OrderItemInput(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(alias="productId", min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=140)
    size: str = Field(min_length=1, max_length=120)
    edge: OrderEdgeInput | None = None
    note: str | None = Field(default=None, max_length=180)
    unit_price: MoneyField = Field(alias="unitPrice")
    qty: PositiveQuantityField
    line_total: MoneyField = Field(alias="lineTotal")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("id", "product_id", "name", "size", "note", mode="before")
    @classmethod
    def normalize_item_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class OrderSummaryInput(BaseModel):
    item_count: PositiveQuantityField = Field(alias="itemCount")
    subtotal: MoneyField
    total: MoneyField

    model_config = ConfigDict(populate_by_name=True)


class OrderCreateInput(BaseModel):
    channel: OrderChannel = OrderChannel.SITE
    created_at: datetime | None = Field(default=None, alias="createdAt")
    customer: OrderCustomerInput
    fulfillment: OrderFulfillmentInput
    payment: OrderPaymentInput
    items: list[OrderItemInput] = Field(min_length=1, max_length=40)
    summary: OrderSummaryInput | None = None
    notes: str | None = Field(default=None, max_length=260)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def validate_delivery_fields(self) -> "OrderCreateInput":
        if self.fulfillment.type == FulfillmentType.DELIVERY:
            required_fields = {
                "postalCode": self.fulfillment.postal_code,
                "neighborhood": self.fulfillment.neighborhood,
                "street": self.fulfillment.street,
                "number": self.fulfillment.number,
            }
            missing = [field for field, value in required_fields.items() if not value]

            if missing:
                field_list = ", ".join(missing)
                raise ValueError(f"Campos obrigatorios para entrega ausentes: {field_list}.")

        return self


class OrderCreateResponse(BaseModel):
    id: int
    public_id: UUID = Field(alias="publicId")
    status: OrderStatus
    total: Decimal
    created_at: datetime = Field(alias="createdAt")
    loyalty: LoyaltySummaryOutput | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OrderTrackingItemOutput(BaseModel):
    name: str
    quantity: int
    option: str | None = None


class OrderTrackingResponse(BaseModel):
    public_id: UUID = Field(alias="publicId")
    status: OrderStatus
    fulfillment_type: FulfillmentType = Field(alias="fulfillmentType")
    total: Decimal
    created_at: datetime = Field(alias="createdAt")
    item_count: int = Field(alias="itemCount")
    customer_first_name: str = Field(alias="customerFirstName")
    items: list[OrderTrackingItemOutput]

    model_config = ConfigDict(populate_by_name=True)
