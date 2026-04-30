from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.order import OrderCreateInput, OrderCreateResponse
from app.services.orders import create_order

router = APIRouter(prefix="/orders")


@router.post("", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
def create_order_endpoint(payload: OrderCreateInput, db: Session = Depends(get_db)) -> OrderCreateResponse:
    order = create_order(db, payload)
    return OrderCreateResponse.model_validate(order)
