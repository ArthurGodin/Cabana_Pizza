from __future__ import annotations

from enum import Enum


class ProductType(str, Enum):
    PIZZA = "pizza"
    DRINK = "drink"


class PizzaSize(str, Enum):
    M = "M"
    G = "G"
    GG = "GG"


class FulfillmentType(str, Enum):
    DELIVERY = "delivery"
    PICKUP = "pickup"


class PaymentMethod(str, Enum):
    PIX = "pix"
    MONEY = "money"
    CARD = "card"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    OUT_FOR_DELIVERY = "out_for_delivery"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderChannel(str, Enum):
    SITE = "site"
    ADMIN = "admin"
    WHATSAPP = "whatsapp"


def enum_values(enum_class: type[Enum]) -> list[str]:
    return [item.value for item in enum_class]
