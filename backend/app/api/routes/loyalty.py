from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.loyalty import LoyaltySummaryOutput
from app.services.loyalty import read_loyalty_summary

router = APIRouter(prefix="/loyalty")


@router.get(
    "",
    response_model=LoyaltySummaryOutput,
    dependencies=[Depends(rate_limit("public_loyalty", limit=30, window_seconds=60))],
)
def read_public_loyalty(
    phone: str = Query(min_length=8, max_length=20),
    db: Session = Depends(get_db),
) -> LoyaltySummaryOutput:
    try:
        return read_loyalty_summary(db, phone)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
