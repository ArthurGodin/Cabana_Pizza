from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StoreStatusOutput(BaseModel):
    is_ordering_paused: bool = Field(alias="isOrderingPaused")
    pause_reason: str | None = Field(alias="pauseReason")
    accepts_orders: bool = Field(alias="acceptsOrders")
    updated_at: datetime | None = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class StoreStatusUpdateInput(BaseModel):
    is_ordering_paused: bool = Field(alias="isOrderingPaused")
    pause_reason: str | None = Field(default=None, alias="pauseReason", max_length=180)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("pause_reason", mode="before")
    @classmethod
    def normalize_pause_reason(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value
