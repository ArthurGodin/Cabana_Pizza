from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.admin_auth import upsert_admin_user


def main() -> None:
    settings = get_settings()

    name = settings.admin_bootstrap_name.strip()
    email = settings.admin_bootstrap_email.strip().lower()
    password = settings.admin_bootstrap_password.strip()

    if not name or not email or not password:
        raise SystemExit(
            "Defina ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD no .env antes de rodar o bootstrap."
        )

    with SessionLocal() as db:
        admin, created = upsert_admin_user(
            db,
            name=name,
            email=email,
            password=password,
            is_superuser=True,
        )

    action = "criado" if created else "atualizado"
    print(f"Admin {action} com sucesso: {admin.email}")


if __name__ == "__main__":
    main()
