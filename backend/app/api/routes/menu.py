from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.menu_catalog import build_public_menu

router = APIRouter(prefix="/menu")


@router.get("")
def read_public_menu(db: Session = Depends(get_db)) -> dict[str, Any]:
    return build_public_menu(db)
