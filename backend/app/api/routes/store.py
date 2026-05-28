from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.store import StoreStatusOutput
from app.services.store_settings import read_store_status

router = APIRouter(prefix="/store")


@router.get(
    "/status",
    response_model=StoreStatusOutput,
    dependencies=[Depends(rate_limit("store_status", limit=60, window_seconds=60))],
)
def read_public_store_status(db: Session = Depends(get_db)) -> StoreStatusOutput:
    return read_store_status(db)
