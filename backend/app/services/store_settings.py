from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.store_setting import StoreSetting
from app.schemas.store import StoreStatusOutput, StoreStatusUpdateInput

STORE_SETTINGS_ID = 1
DEFAULT_PAUSE_REASON = "A loja pausou os pedidos temporariamente. Tente novamente em alguns minutos."


class StorePausedError(ValueError):
    pass


def read_store_status(db: Session) -> StoreStatusOutput:
    setting = load_store_setting(db)

    if setting is None:
        return build_store_status_output(
            is_ordering_paused=False,
            pause_reason=None,
            updated_at=None,
        )

    return build_store_status_output(
        is_ordering_paused=setting.is_ordering_paused,
        pause_reason=setting.pause_reason,
        updated_at=setting.updated_at,
    )


def update_store_status(
    db: Session,
    *,
    payload: StoreStatusUpdateInput,
    current_admin: AdminUser,
) -> StoreStatusOutput:
    setting = load_store_setting(db)

    if setting is None:
        setting = StoreSetting(id=STORE_SETTINGS_ID)
        db.add(setting)

    setting.is_ordering_paused = payload.is_ordering_paused
    setting.pause_reason = payload.pause_reason if payload.is_ordering_paused else None
    setting.updated_by_admin_id = current_admin.id

    db.commit()
    db.refresh(setting)

    return build_store_status_output(
        is_ordering_paused=setting.is_ordering_paused,
        pause_reason=setting.pause_reason,
        updated_at=setting.updated_at,
    )


def ensure_store_accepts_orders(db: Session) -> None:
    status = read_store_status(db)

    if status.is_ordering_paused:
        raise StorePausedError(status.pause_reason or DEFAULT_PAUSE_REASON)


def load_store_setting(db: Session) -> StoreSetting | None:
    return db.scalar(select(StoreSetting).where(StoreSetting.id == STORE_SETTINGS_ID))


def build_store_status_output(
    *,
    is_ordering_paused: bool,
    pause_reason: str | None,
    updated_at,
) -> StoreStatusOutput:
    return StoreStatusOutput(
        isOrderingPaused=is_ordering_paused,
        pauseReason=pause_reason if is_ordering_paused else None,
        acceptsOrders=not is_ordering_paused,
        updatedAt=updated_at,
    )
