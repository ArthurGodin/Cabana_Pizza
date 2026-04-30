from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.order import OrderCreateInput, OrderCreateResponse, OrderTrackingResponse
from app.services.loyalty import read_loyalty_summary
from app.services.orders import create_order, get_order_tracking

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
        loyalty = read_loyalty_summary(db, payload.customer.phone, customer_name=payload.customer.name)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    response = OrderCreateResponse.model_validate(order)
    response.loyalty = loyalty
    return response


@router.get(
    "/{public_id}/tracking",
    response_model=OrderTrackingResponse,
    dependencies=[Depends(rate_limit("order_tracking", limit=30, window_seconds=60))],
)
def read_order_tracking_endpoint(public_id: UUID, db: Session = Depends(get_db)) -> OrderTrackingResponse:
    try:
        return get_order_tracking(db, public_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
