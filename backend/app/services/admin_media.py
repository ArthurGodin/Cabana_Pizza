from __future__ import annotations

import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import Product
from app.schemas.admin import (
    AdminMediaDeleteResponse,
    AdminMediaLibraryItemOutput,
    AdminMediaLibraryResponse,
    AdminMediaUploadResponse,
    AdminMediaUsageProductOutput,
)

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MEDIA_PRODUCTS_SEGMENT = "/products/"


def store_product_image(
    *,
    file: UploadFile,
    settings: Settings,
) -> AdminMediaUploadResponse:
    if (file.content_type or "") not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagem nao suportado. Use JPG, PNG ou WEBP.",
        )

    content = file.file.read()
    file.file.close()

    max_bytes = settings.media_max_upload_mb * 1024 * 1024
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo de imagem vazio.",
        )

    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Imagem excede o limite de {settings.media_max_upload_mb} MB.",
        )

    detected_extension = detect_image_extension(content)
    if detected_extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo invalido. Envie uma imagem JPG, PNG ou WEBP real.",
        )

    products_dir = settings.media_root_path / "products"
    products_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"{secrets.token_hex(12)}{detected_extension}"
    saved_path = products_dir / file_name
    saved_path.write_bytes(content)

    media_path = f"{settings.media_url_prefix.rstrip('/')}/products/{file_name}"
    return AdminMediaUploadResponse(
        fileName=file_name,
        mediaPath=media_path,
        publicUrl=media_path,
        imageKey=media_path,
    )


def list_product_media_library(
    *,
    db: Session,
    settings: Settings,
) -> AdminMediaLibraryResponse:
    products_dir = settings.media_root_path / "products"
    products_dir.mkdir(parents=True, exist_ok=True)

    references = load_media_references(db)
    items: list[AdminMediaLibraryItemOutput] = []

    for file_path in sorted(products_dir.iterdir(), key=lambda current: current.stat().st_mtime, reverse=True):
        if not file_path.is_file():
            continue

        media_path = build_media_path(settings, file_path.name)
        used_by_products = references.get(media_path, [])
        stat = file_path.stat()

        items.append(
            AdminMediaLibraryItemOutput(
                fileName=file_path.name,
                mediaPath=media_path,
                publicUrl=media_path,
                imageKey=media_path,
                usedByCount=len(used_by_products),
                usedByProducts=[
                    AdminMediaUsageProductOutput(id=product.id, code=product.code, name=product.name)
                    for product in used_by_products
                ],
                isOrphan=len(used_by_products) == 0,
                fileSizeBytes=stat.st_size,
                updatedAt=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            )
        )

    return AdminMediaLibraryResponse(items=items)


def delete_product_media(
    *,
    db: Session,
    settings: Settings,
    file_name: str,
) -> AdminMediaDeleteResponse:
    safe_name = normalize_file_name(file_name)
    media_path = build_media_path(settings, safe_name)
    products_using_media = load_media_references(db).get(media_path, [])

    if products_using_media:
        product_names = ", ".join(product.name for product in products_using_media[:3])
        suffix = "..." if len(products_using_media) > 3 else ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Imagem ainda em uso por {product_names}{suffix}. Troque ou remova a referencia antes de excluir.",
        )

    file_path = settings.media_root_path / "products" / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de imagem nao encontrado na biblioteca.",
        )

    file_path.unlink()
    return AdminMediaDeleteResponse(
        detail="Imagem removida da biblioteca.",
        fileName=safe_name,
    )


def load_media_references(db: Session) -> dict[str, list[Product]]:
    products = db.scalars(
        select(Product)
        .where(Product.image_url.is_not(None))
        .where(Product.image_url.like(f"%{MEDIA_PRODUCTS_SEGMENT}%"))
        .order_by(Product.name.asc())
    ).all()

    references: dict[str, list[Product]] = {}
    for product in products:
        if not product.image_url:
            continue
        references.setdefault(product.image_url, []).append(product)

    return references


def normalize_file_name(file_name: str) -> str:
    candidate = Path(file_name).name.strip()
    if not candidate or candidate in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de arquivo invalido.",
        )

    if "/" in file_name or "\\" in file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de arquivo invalido.",
        )

    return candidate


def build_media_path(settings: Settings, file_name: str) -> str:
    return f"{settings.media_url_prefix.rstrip('/')}/products/{file_name}"


def detect_image_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"

    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"

    return None
