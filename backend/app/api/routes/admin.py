from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin_user import AdminUser
from app.models.enums import FulfillmentType, OrderStatus
from app.schemas.admin import (
    AdminCatalogResponse,
    AdminMediaDeleteResponse,
    AdminMediaLibraryResponse,
    AdminCrustFlavorUpdateInput,
    AdminCrustFlavorUpdateResponse,
    AdminCrustPriceTableUpdateInput,
    AdminCrustPriceTableUpdateResponse,
    AdminLoginInput,
    AdminLoginResponse,
    AdminMediaUploadResponse,
    AdminOrderListResponse,
    AdminOrdersDashboardResponse,
    AdminOrderStatusUndoResponse,
    AdminOrderStatusUpdateInput,
    AdminOrderStatusUpdateResponse,
    AdminPizzaBasePriceUpdateInput,
    AdminPizzaBasePriceUpdateResponse,
    AdminProductCreateInput,
    AdminProductCreateResponse,
    AdminProductOptionCreateInput,
    AdminProductOptionCreateResponse,
    AdminProductOptionUpdateInput,
    AdminProductOptionUpdateResponse,
    AdminProductUpdateInput,
    AdminProductUpdateResponse,
    AdminUserOutput,
)
from app.services.admin_auth import login_admin
from app.services.admin_catalog import (
    read_admin_catalog,
    create_admin_product,
    create_admin_product_option,
    update_admin_product,
    update_admin_product_option,
    update_crust_flavor,
    update_crust_price_table,
    update_pizza_base_prices,
)
from app.services.admin_media import delete_product_media, list_product_media_library, store_product_image
from app.services.admin_orders import (
    get_orders_dashboard,
    list_recent_orders,
    undo_order_status_change,
    update_order_status,
)
from app.core.config import get_settings

router = APIRouter(prefix="/admin")


@router.post("/login", response_model=AdminLoginResponse)
def login_admin_endpoint(payload: AdminLoginInput, db: Session = Depends(get_db)) -> AdminLoginResponse:
    try:
        return login_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


@router.post("/logout")
def logout_admin_endpoint(current_admin: AdminUser = Depends(get_current_admin)) -> dict[str, str]:
    return {
        "detail": f"Sessao encerrada para {current_admin.email}.",
    }


@router.get("/me", response_model=AdminUserOutput)
def read_admin_me(current_admin: AdminUser = Depends(get_current_admin)) -> AdminUserOutput:
    return AdminUserOutput.model_validate(current_admin)


@router.get("/orders", response_model=AdminOrderListResponse)
def read_admin_orders(
    limit: int = Query(default=20, ge=1, le=100),
    status: OrderStatus | None = Query(default=None),
    fulfillment: FulfillmentType | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=120),
    date_from: date | None = Query(default=None, alias="dateFrom"),
    date_to: date | None = Query(default=None, alias="dateTo"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminOrderListResponse:
    _ = current_admin
    return AdminOrderListResponse(
        orders=list_recent_orders(
            db,
            limit=limit,
            status=status,
            fulfillment=fulfillment,
            search=search,
            date_from=date_from,
            date_to=date_to,
        )
    )


@router.get("/orders/dashboard", response_model=AdminOrdersDashboardResponse)
def read_admin_orders_dashboard(
    date_from: date | None = Query(default=None, alias="dateFrom"),
    date_to: date | None = Query(default=None, alias="dateTo"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminOrdersDashboardResponse:
    _ = current_admin
    return get_orders_dashboard(db, date_from=date_from, date_to=date_to)


@router.patch("/orders/{order_id}/status", response_model=AdminOrderStatusUpdateResponse)
def patch_admin_order_status(
    order_id: int,
    payload: AdminOrderStatusUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminOrderStatusUpdateResponse:
    order = update_order_status(
        db,
        order_id=order_id,
        next_status=payload.status,
        current_admin=current_admin,
    )
    return AdminOrderStatusUpdateResponse(order=order)


@router.post("/orders/{order_id}/undo-status", response_model=AdminOrderStatusUndoResponse)
def post_admin_order_status_undo(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminOrderStatusUndoResponse:
    order = undo_order_status_change(db, order_id=order_id, current_admin=current_admin)
    return AdminOrderStatusUndoResponse(order=order)


@router.get("/catalog", response_model=AdminCatalogResponse)
def read_catalog(
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminCatalogResponse:
    _ = current_admin
    return read_admin_catalog(db)


@router.post("/media/product-image", response_model=AdminMediaUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_product_image(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminMediaUploadResponse:
    _ = current_admin
    settings = get_settings()
    return store_product_image(file=file, settings=settings)


@router.get("/media/products", response_model=AdminMediaLibraryResponse)
def read_product_media_library(
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminMediaLibraryResponse:
    _ = current_admin
    settings = get_settings()
    return list_product_media_library(db=db, settings=settings)


@router.delete("/media/products/{file_name}", response_model=AdminMediaDeleteResponse)
def destroy_product_media(
    file_name: str,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminMediaDeleteResponse:
    _ = current_admin
    settings = get_settings()
    return delete_product_media(db=db, settings=settings, file_name=file_name)


@router.post("/products", response_model=AdminProductCreateResponse, status_code=status.HTTP_201_CREATED)
def post_admin_product(
    payload: AdminProductCreateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminProductCreateResponse:
    _ = current_admin
    product = create_admin_product(db, payload)
    return AdminProductCreateResponse(product=product)


@router.patch("/products/{product_id}", response_model=AdminProductUpdateResponse)
def patch_admin_product(
    product_id: int,
    payload: AdminProductUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminProductUpdateResponse:
    _ = current_admin
    product = update_admin_product(db, product_id=product_id, payload=payload)
    return AdminProductUpdateResponse(product=product)


@router.post(
    "/product-options",
    response_model=AdminProductOptionCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_admin_product_option(
    payload: AdminProductOptionCreateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminProductOptionCreateResponse:
    _ = current_admin
    option = create_admin_product_option(db, payload)
    return AdminProductOptionCreateResponse(option=option)


@router.patch("/product-options/{option_id}", response_model=AdminProductOptionUpdateResponse)
def patch_admin_product_option(
    option_id: int,
    payload: AdminProductOptionUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminProductOptionUpdateResponse:
    _ = current_admin
    option = update_admin_product_option(db, option_id=option_id, payload=payload)
    return AdminProductOptionUpdateResponse(option=option)


@router.patch("/pizza-prices/{category_code}", response_model=AdminPizzaBasePriceUpdateResponse)
def patch_pizza_base_prices(
    category_code: str,
    payload: AdminPizzaBasePriceUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminPizzaBasePriceUpdateResponse:
    _ = current_admin
    price_table = update_pizza_base_prices(db, category_code=category_code, payload=payload)
    return AdminPizzaBasePriceUpdateResponse(priceTable=price_table)


@router.patch("/crust-prices", response_model=AdminCrustPriceTableUpdateResponse)
def patch_crust_price_table(
    payload: AdminCrustPriceTableUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminCrustPriceTableUpdateResponse:
    _ = current_admin
    crust_prices = update_crust_price_table(db, payload)
    return AdminCrustPriceTableUpdateResponse(crustPrices=crust_prices)


@router.patch("/crust-flavors/{crust_flavor_id}", response_model=AdminCrustFlavorUpdateResponse)
def patch_crust_flavor(
    crust_flavor_id: int,
    payload: AdminCrustFlavorUpdateInput,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminCrustFlavorUpdateResponse:
    _ = current_admin
    crust_flavor = update_crust_flavor(db, crust_flavor_id=crust_flavor_id, payload=payload)
    return AdminCrustFlavorUpdateResponse(crustFlavor=crust_flavor)
