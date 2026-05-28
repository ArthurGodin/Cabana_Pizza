from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.rate_limit import rate_limit
from app.services.delivery_fees import DEFAULT_DEMO_DELIVERY_FEE, DEMO_DELIVERY_FEES

router = APIRouter(prefix="/delivery")


@router.get(
    "/fees",
    dependencies=[Depends(rate_limit("delivery_fees", limit=60, window_seconds=60))],
)
def read_delivery_fees() -> dict[str, object]:
    return {
        "demo": True,
        "defaultFee": DEFAULT_DEMO_DELIVERY_FEE,
        "items": [
            {"neighborhood": neighborhood, "fee": fee}
            for neighborhood, fee in DEMO_DELIVERY_FEES.items()
        ],
    }
