from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.order import OrderCreateInput, OrderCreateResponse
from app.services.orders import create_order

router = APIRouter(prefix="/orders")


@router.post(
    "",
    response_model=OrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("public_orders", limit=8, window_seconds=60))],
)
def create_order_endpoint(payload: OrderCreateInput, db: Session = Depends(get_db)) -> OrderCreateResponse:
    try:
        order = create_order(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return OrderCreateResponse.model_validate(order)
