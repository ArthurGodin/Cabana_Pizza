from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.admin_user import AdminUser
from app.schemas.admin import AdminLoginInput, AdminLoginResponse, AdminUserOutput


def login_admin(db: Session, payload: AdminLoginInput) -> AdminLoginResponse:
    admin = authenticate_admin(db, payload.email, payload.password)
    settings = get_settings()
    token = create_access_token(
        admin.email,
        extra_claims={
            "admin_id": admin.id,
            "admin_name": admin.name,
        },
    )

    return AdminLoginResponse(
        accessToken=token,
        tokenType="bearer",
        expiresIn=settings.auth_access_token_expire_minutes * 60,
        user=AdminUserOutput.model_validate(admin),
    )


def authenticate_admin(db: Session, email: str, password: str) -> AdminUser:
    normalized_email = email.strip().lower()
    admin = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))

    if admin is None or not admin.is_active or not verify_password(password, admin.password_hash):
        raise ValueError("Email ou senha invalidos.")

    admin.last_login_at = datetime.now(UTC)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def upsert_admin_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    is_superuser: bool = True,
) -> tuple[AdminUser, bool]:
    normalized_email = email.strip().lower()
    admin = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))
    created = admin is None

    if admin is None:
        admin = AdminUser(
            name=name.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
            is_active=True,
            is_superuser=is_superuser,
        )
    else:
        admin.name = name.strip()
        admin.password_hash = hash_password(password)
        admin.is_active = True
        admin.is_superuser = is_superuser

    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin, created
