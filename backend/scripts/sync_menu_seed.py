from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.services.menu_catalog import sync_menu_seed_to_db


def main() -> None:
    with SessionLocal() as db:
        stats = sync_menu_seed_to_db(db)

    print(
        "Menu sincronizado com sucesso: "
        f"{stats['categories']} categorias, "
        f"{stats['products']} produtos, "
        f"{stats['options']} opcoes, "
        f"{stats['pizza_prices']} precos base."
    )


if __name__ == "__main__":
    main()
