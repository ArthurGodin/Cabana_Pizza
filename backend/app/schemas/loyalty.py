from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoyaltySummaryOutput(BaseModel):
    customer_phone: str = Field(alias="customerPhone")
    customer_name: str | None = Field(alias="customerName", default=None)
    qualifying_pizzas: int = Field(alias="qualifyingPizzas")
    redeemed_rewards: int = Field(alias="redeemedRewards")
    earned_rewards: int = Field(alias="earnedRewards")
    available_rewards: int = Field(alias="availableRewards")
    progress_count: int = Field(alias="progressCount")
    pizzas_until_next_reward: int = Field(alias="pizzasUntilNextReward")

    model_config = ConfigDict(populate_by_name=True)


class LoyaltyRedemptionOutput(BaseModel):
    id: int
    customer_phone: str = Field(alias="customerPhone")
    customer_name: str | None = Field(alias="customerName")
    pizza_name: str | None = Field(alias="pizzaName")
    order_id: int | None = Field(alias="orderId")
    redeemed_by_admin_id: int | None = Field(alias="redeemedByAdminId")
    note: str | None
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class LoyaltyCustomerListResponse(BaseModel):
    customers: list[LoyaltySummaryOutput]

    model_config = ConfigDict(populate_by_name=True)


class LoyaltyRedemptionCreateInput(BaseModel):
    customer_phone: str = Field(alias="customerPhone", min_length=8, max_length=20)
    customer_name: str | None = Field(default=None, alias="customerName", max_length=120)
    pizza_name: str | None = Field(default=None, alias="pizzaName", max_length=140)
    order_id: int | None = Field(default=None, alias="orderId", ge=1)
    note: str | None = Field(default=None, max_length=260)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("customer_phone", "customer_name", "pizza_name", "note", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class LoyaltyRedemptionCreateResponse(BaseModel):
    redemption: LoyaltyRedemptionOutput
    summary: LoyaltySummaryOutput

    model_config = ConfigDict(populate_by_name=True)
