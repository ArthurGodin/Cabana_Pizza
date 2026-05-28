from __future__ import annotations

from decimal import Decimal
import unicodedata

from app.models.enums import FulfillmentType

DEFAULT_DEMO_DELIVERY_FEE = Decimal("8.00")

DEMO_DELIVERY_FEES: dict[str, Decimal] = {
    "Centro": Decimal("6.00"),
    "Santo Antônio": Decimal("7.00"),
    "Cidade Nova": Decimal("9.00"),
    "Parque Piauí I": Decimal("8.00"),
    "Parque Piauí II": Decimal("8.00"),
    "Parque Alvorada": Decimal("9.00"),
    "Parque São Francisco": Decimal("10.00"),
    "Parque São Francisco II": Decimal("10.00"),
    "Parque União": Decimal("10.00"),
    "Boa Vista": Decimal("9.00"),
    "Conjunto Boa Vista": Decimal("10.00"),
    "Coheb": Decimal("8.00"),
    "Formosa": Decimal("10.00"),
    "Planalto Formosa": Decimal("11.00"),
    "Flores": Decimal("12.00"),
    "Reserva das Flores": Decimal("12.00"),
    "Guarita": Decimal("8.00"),
    "Mateuzinho": Decimal("10.00"),
    "Parque Aliança": Decimal("11.00"),
    "Pedro Patrício": Decimal("12.00"),
    "Mutirão": Decimal("10.00"),
    "Centro Operário": Decimal("9.00"),
    "Loteamento Boa Vista": Decimal("11.00"),
    "Novo Joia": Decimal("12.00"),
}

def calculate_delivery_fee(
    *,
    fulfillment_type: FulfillmentType,
    neighborhood: str | None,
) -> Decimal:
    if fulfillment_type != FulfillmentType.DELIVERY:
        return Decimal("0.00")

    normalized_neighborhood = normalize_neighborhood(neighborhood or "")

    if not normalized_neighborhood:
        return Decimal("0.00")

    return NORMALIZED_DEMO_DELIVERY_FEES.get(
        normalized_neighborhood,
        DEFAULT_DEMO_DELIVERY_FEE,
    )


def normalize_neighborhood(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    without_accents = "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
    return " ".join(without_accents.split())


NORMALIZED_DEMO_DELIVERY_FEES = {
    normalize_neighborhood(neighborhood): fee
    for neighborhood, fee in DEMO_DELIVERY_FEES.items()
}
