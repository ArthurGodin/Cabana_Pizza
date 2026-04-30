from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.admin_user import AdminUser

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized_admin_exception()

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise unauthorized_admin_exception(str(exc)) from exc

    email = str(payload["sub"]).strip().lower()
    admin = db.scalar(
        select(AdminUser).where(
            AdminUser.email == email,
            AdminUser.is_active.is_(True),
        )
    )

    if admin is None:
        raise unauthorized_admin_exception()

    return admin


def unauthorized_admin_exception(detail: str = "Credenciais de admin invalidas.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )
