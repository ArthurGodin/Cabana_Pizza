from __future__ import annotations

import secrets
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

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

    if use_supabase_storage(settings):
        return store_product_image_supabase(
            content=content,
            extension=detected_extension,
            content_type=file.content_type or "application/octet-stream",
            settings=settings,
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
    if use_supabase_storage(settings):
        return list_product_media_library_supabase(db=db, settings=settings)

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
    media_path = (
        build_supabase_public_url(settings, build_supabase_object_path(settings, safe_name))
        if use_supabase_storage(settings)
        else build_media_path(settings, safe_name)
    )
    products_using_media = load_media_references(db).get(media_path, [])

    if products_using_media:
        product_names = ", ".join(product.name for product in products_using_media[:3])
        suffix = "..." if len(products_using_media) > 3 else ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Imagem ainda em uso por {product_names}{suffix}. Troque ou remova a referencia antes de excluir.",
        )

    if use_supabase_storage(settings):
        delete_supabase_object(settings=settings, file_name=safe_name)
        return AdminMediaDeleteResponse(
            detail="Imagem removida da biblioteca.",
            fileName=safe_name,
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


def use_supabase_storage(settings: Settings) -> bool:
    provider = settings.media_storage_provider.strip().lower()

    if provider == "local":
        return False

    if provider != "supabase":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MEDIA_STORAGE_PROVIDER invalido. Use local ou supabase.",
        )

    missing = [
        key
        for key, value in {
            "SUPABASE_URL": settings.supabase_url,
            "SUPABASE_SERVICE_ROLE_KEY": settings.supabase_service_role_key,
            "SUPABASE_STORAGE_BUCKET": settings.supabase_storage_bucket,
        }.items()
        if not value.strip()
    ]

    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage Supabase sem configuracao: {', '.join(missing)}.",
        )

    return True


def store_product_image_supabase(
    *,
    content: bytes,
    extension: str,
    content_type: str,
    settings: Settings,
) -> AdminMediaUploadResponse:
    file_name = f"{secrets.token_hex(12)}{extension}"
    object_path = build_supabase_object_path(settings, file_name)
    request_path = build_supabase_storage_path(settings, object_path)
    request = build_supabase_request(
        settings=settings,
        method="PUT",
        path=request_path,
        data=content,
        content_type=content_type,
        extra_headers={"x-upsert": "false"},
    )

    try:
        read_json_response(request)
    except HTTPException:
        raise

    public_url = build_supabase_public_url(settings, object_path)
    return AdminMediaUploadResponse(
        fileName=file_name,
        mediaPath=public_url,
        publicUrl=public_url,
        imageKey=public_url,
    )


def list_product_media_library_supabase(
    *,
    db: Session,
    settings: Settings,
) -> AdminMediaLibraryResponse:
    prefix = clean_supabase_prefix(settings)
    request = build_supabase_request(
        settings=settings,
        method="POST",
        path=f"/storage/v1/object/list/{quote(settings.supabase_storage_bucket, safe='')}",
        data=json.dumps(
            {
                "prefix": prefix,
                "limit": 100,
                "offset": 0,
                "sortBy": {"column": "created_at", "order": "desc"},
            }
        ).encode("utf-8"),
        content_type="application/json",
    )
    data = read_json_response(request)
    references = load_media_references(db)
    items: list[AdminMediaLibraryItemOutput] = []

    for entry in data if isinstance(data, list) else []:
        if not isinstance(entry, dict):
            continue

        raw_name = str(entry.get("name") or "").strip()
        if not raw_name:
            continue

        file_name = Path(raw_name).name
        object_path = raw_name if raw_name.startswith(f"{prefix}/") else f"{prefix}/{file_name}"
        public_url = build_supabase_public_url(settings, object_path)
        used_by_products = references.get(public_url, [])
        metadata = entry.get("metadata") if isinstance(entry.get("metadata"), dict) else {}

        items.append(
            AdminMediaLibraryItemOutput(
                fileName=file_name,
                mediaPath=public_url,
                publicUrl=public_url,
                imageKey=public_url,
                usedByCount=len(used_by_products),
                usedByProducts=[
                    AdminMediaUsageProductOutput(id=product.id, code=product.code, name=product.name)
                    for product in used_by_products
                ],
                isOrphan=len(used_by_products) == 0,
                fileSizeBytes=parse_int(metadata.get("size")),
                updatedAt=parse_datetime(entry.get("updated_at") or entry.get("created_at")),
            )
        )

    return AdminMediaLibraryResponse(items=items)


def delete_supabase_object(*, settings: Settings, file_name: str) -> None:
    object_path = build_supabase_object_path(settings, file_name)
    request = build_supabase_request(
        settings=settings,
        method="DELETE",
        path=build_supabase_storage_path(settings, object_path),
    )
    read_json_response(request)


def build_supabase_object_path(settings: Settings, file_name: str) -> str:
    return f"{clean_supabase_prefix(settings)}/{file_name}"


def clean_supabase_prefix(settings: Settings) -> str:
    return settings.supabase_storage_path_prefix.strip().strip("/") or "products"


def build_supabase_storage_path(settings: Settings, object_path: str) -> str:
    bucket = quote(settings.supabase_storage_bucket.strip(), safe="")
    quoted_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
    return f"/storage/v1/object/{bucket}/{quoted_path}"


def build_supabase_public_url(settings: Settings, object_path: str) -> str:
    bucket = quote(settings.supabase_storage_bucket.strip(), safe="")
    quoted_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{quoted_path}"


def build_supabase_request(
    *,
    settings: Settings,
    method: str,
    path: str,
    data: bytes | None = None,
    content_type: str | None = None,
    extra_headers: dict[str, str] | None = None,
) -> Request:
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }

    if content_type:
        headers["Content-Type"] = content_type

    if extra_headers:
        headers.update(extra_headers)

    return Request(
        url=f"{settings.supabase_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )


def read_json_response(request: Request):
    try:
        with urlopen(request, timeout=12) as response:
            raw = response.read()
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") or exc.reason
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha no Supabase Storage: {detail}",
        ) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Nao foi possivel conectar ao Supabase Storage: {exc.reason}",
        ) from exc

    if not raw:
        return None

    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def parse_int(value: object) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def parse_datetime(value: object) -> datetime:
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass

    return datetime.now(timezone.utc)


def detect_image_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"

    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"

    return None
