from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.db.session import check_database_connection

router = APIRouter()


@router.get("/health")
def read_health() -> dict[str, object]:
    settings = get_settings()

    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.app_env,
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/database")
def read_database_health() -> dict[str, object]:
    settings = get_settings()
    database_connected = check_database_connection()

    return {
        "status": "healthy" if database_connected else "degraded",
        "service": settings.app_name,
        "database": {
            "configured": bool(settings.database_url),
            "connected": database_connected,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
