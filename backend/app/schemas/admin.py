from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import FulfillmentType, OrderStatus, PaymentMethod, ProductType

PositiveLimit = Annotated[int, Field(ge=1, le=100)]
CatalogSortOrder = Annotated[int, Field(ge=0, le=999)]
CatalogPrice = Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]


class AdminLoginInput(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=120)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class AdminUserOutput(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool = Field(alias="isActive")
    is_superuser: bool = Field(alias="isSuperuser")
    last_login_at: datetime | None = Field(alias="lastLoginAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminLoginResponse(BaseModel):
    access_token: str = Field(alias="accessToken")
    token_type: str = Field(alias="tokenType")
    expires_in: int = Field(alias="expiresIn")
    user: AdminUserOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderItemOutput(BaseModel):
    id: int
    product_name: str = Field(alias="productName")
    product_option_label: str | None = Field(alias="productOptionLabel")
    pizza_size: str | None = Field(alias="pizzaSize")
    crust_name: str | None = Field(alias="crustName")
    note: str | None
    unit_price: Decimal = Field(alias="unitPrice")
    quantity: int
    line_total: Decimal = Field(alias="lineTotal")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderEventOutput(BaseModel):
    id: int
    event_type: str = Field(alias="eventType")
    previous_status: OrderStatus | None = Field(alias="previousStatus")
    next_status: OrderStatus | None = Field(alias="nextStatus")
    admin_user_id: int | None = Field(alias="adminUserId")
    admin_user_name: str | None = Field(alias="adminUserName")
    note: str | None = None
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderListItemOutput(BaseModel):
    id: int
    public_id: UUID = Field(alias="publicId")
    status: OrderStatus
    previous_status: OrderStatus | None = Field(alias="previousStatus", default=None)
    can_undo_status_change: bool = Field(alias="canUndoStatusChange", default=False)
    status_changed_at: datetime | None = Field(alias="statusChangedAt", default=None)
    customer_name: str = Field(alias="customerName")
    customer_phone: str = Field(alias="customerPhone")
    fulfillment_type: FulfillmentType = Field(alias="fulfillmentType")
    payment_method: PaymentMethod = Field(alias="paymentMethod")
    change_for: Decimal | None = Field(alias="changeFor", default=None)
    postal_code: str | None = Field(alias="postalCode", default=None)
    neighborhood: str | None = None
    street: str | None = None
    number: str | None = None
    city: str | None = None
    state: str | None = None
    complement: str | None = None
    reference: str | None = None
    subtotal: Decimal
    delivery_fee: Decimal = Field(alias="deliveryFee")
    total: Decimal
    notes: str | None = None
    created_at: datetime = Field(alias="createdAt")
    items: list[AdminOrderItemOutput]
    events: list[AdminOrderEventOutput] = Field(default_factory=list)
    item_count: int = Field(alias="itemCount")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderListResponse(BaseModel):
    orders: list[AdminOrderListItemOutput]

    model_config = ConfigDict(populate_by_name=True)


class AdminDashboardRankItem(BaseModel):
    label: str
    value: int

    model_config = ConfigDict(populate_by_name=True)


class AdminOrdersDashboardResponse(BaseModel):
    total_orders: int = Field(alias="totalOrders")
    pending_orders: int = Field(alias="pendingOrders")
    confirmed_orders: int = Field(alias="confirmedOrders")
    preparing_orders: int = Field(alias="preparingOrders")
    out_for_delivery_orders: int = Field(alias="outForDeliveryOrders")
    completed_orders: int = Field(alias="completedOrders")
    cancelled_orders: int = Field(alias="cancelledOrders")
    delivery_orders: int = Field(alias="deliveryOrders")
    pickup_orders: int = Field(alias="pickupOrders")
    gross_revenue: Decimal = Field(alias="grossRevenue")
    completed_revenue: Decimal = Field(alias="completedRevenue")
    average_ticket: Decimal = Field(alias="averageTicket")
    top_products: list[AdminDashboardRankItem] = Field(alias="topProducts", default_factory=list)
    top_neighborhoods: list[AdminDashboardRankItem] = Field(alias="topNeighborhoods", default_factory=list)
    busy_hours: list[AdminDashboardRankItem] = Field(alias="busyHours", default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class AdminOrdersQuery(BaseModel):
    limit: PositiveLimit = 20


class AdminOrderStatusUpdateInput(BaseModel):
    status: OrderStatus


class AdminOrderStatusUpdateResponse(BaseModel):
    order: AdminOrderListItemOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderStatusUndoResponse(BaseModel):
    order: AdminOrderListItemOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminCatalogProductOptionOutput(BaseModel):
    id: int
    code: str
    label: str
    price: Decimal
    is_active: bool = Field(alias="isActive")
    sort_order: int = Field(alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)


class AdminCatalogProductOutput(BaseModel):
    id: int
    category_code: str = Field(alias="categoryCode")
    category_name: str = Field(alias="categoryName")
    product_type: ProductType = Field(alias="productType")
    code: str
    name: str
    description: str | None = None
    image_key: str | None = Field(alias="imageKey")
    badge_text: str | None = Field(alias="badgeText")
    is_featured: bool = Field(alias="isFeatured")
    is_active: bool = Field(alias="isActive")
    sort_order: int = Field(alias="sortOrder")
    options: list[AdminCatalogProductOptionOutput]

    model_config = ConfigDict(populate_by_name=True)


class AdminCatalogCategoryOutput(BaseModel):
    id: int
    code: str
    name: str
    product_type: ProductType = Field(alias="productType")
    is_active: bool = Field(alias="isActive")
    sort_order: int = Field(alias="sortOrder")
    products: list[AdminCatalogProductOutput]

    model_config = ConfigDict(populate_by_name=True)


class AdminPizzaBasePriceOutput(BaseModel):
    category_id: int = Field(alias="categoryId")
    category_code: str = Field(alias="categoryCode")
    category_name: str = Field(alias="categoryName")
    prices: dict[str, Decimal]

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustPriceTableOutput(BaseModel):
    M: Decimal
    G: Decimal
    GG: Decimal

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustFlavorOutput(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    is_active: bool = Field(alias="isActive")
    sort_order: int = Field(alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)


class AdminCatalogResponse(BaseModel):
    categories: list[AdminCatalogCategoryOutput]
    pizza_base_prices: list[AdminPizzaBasePriceOutput] = Field(alias="pizzaBasePrices")
    crust_prices: AdminCrustPriceTableOutput = Field(alias="crustPrices")
    crust_flavors: list[AdminCrustFlavorOutput] = Field(alias="crustFlavors")

    model_config = ConfigDict(populate_by_name=True)


class AdminProductUpdateInput(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=1600)
    image_key: str | None = Field(default=None, alias="imageKey", max_length=120)
    badge_text: str | None = Field(default=None, alias="badgeText", max_length=40)
    is_featured: bool | None = Field(default=None, alias="isFeatured")
    is_active: bool | None = Field(default=None, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name", "description", "image_key", "badge_text", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminProductOptionUpdateInput(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    price: CatalogPrice | None = None
    is_active: bool | None = Field(default=None, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("label", mode="before")
    @classmethod
    def strip_option_label(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminProductOptionCreateInput(BaseModel):
    product_id: int = Field(alias="productId", ge=1)
    code: str | None = Field(default=None, min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    price: CatalogPrice
    is_active: bool = Field(default=True, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("code", "label", mode="before")
    @classmethod
    def strip_option_create_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminCreateInitialOptionInput(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    price: CatalogPrice
    is_active: bool = Field(default=True, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("code", "label", mode="before")
    @classmethod
    def strip_initial_option_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminProductCreateInput(BaseModel):
    category_code: str = Field(alias="categoryCode", min_length=1, max_length=50)
    code: str | None = Field(default=None, min_length=1, max_length=80)
    name: str = Field(min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=1600)
    image_key: str | None = Field(default=None, alias="imageKey", max_length=120)
    badge_text: str | None = Field(default=None, alias="badgeText", max_length=40)
    is_featured: bool = Field(default=False, alias="isFeatured")
    is_active: bool = Field(default=True, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")
    initial_option: AdminCreateInitialOptionInput | None = Field(default=None, alias="initialOption")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("category_code", "code", "name", "description", "image_key", "badge_text", mode="before")
    @classmethod
    def strip_product_create_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminPizzaBasePriceUpdateInput(BaseModel):
    price_m: CatalogPrice = Field(alias="M")
    price_g: CatalogPrice = Field(alias="G")
    price_gg: CatalogPrice = Field(alias="GG")

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustPriceTableUpdateInput(BaseModel):
    price_m: CatalogPrice = Field(alias="M")
    price_g: CatalogPrice = Field(alias="G")
    price_gg: CatalogPrice = Field(alias="GG")

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustFlavorUpdateInput(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=600)
    is_active: bool | None = Field(default=None, alias="isActive")
    sort_order: CatalogSortOrder | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name", "description", mode="before")
    @classmethod
    def strip_crust_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminProductUpdateResponse(BaseModel):
    product: AdminCatalogProductOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminProductCreateResponse(BaseModel):
    product: AdminCatalogProductOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminProductOptionUpdateResponse(BaseModel):
    option: AdminCatalogProductOptionOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminProductOptionCreateResponse(BaseModel):
    option: AdminCatalogProductOptionOutput

    model_config = ConfigDict(populate_by_name=True)


class AdminPizzaBasePriceUpdateResponse(BaseModel):
    price_table: AdminPizzaBasePriceOutput = Field(alias="priceTable")

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustPriceTableUpdateResponse(BaseModel):
    crust_prices: AdminCrustPriceTableOutput = Field(alias="crustPrices")

    model_config = ConfigDict(populate_by_name=True)


class AdminCrustFlavorUpdateResponse(BaseModel):
    crust_flavor: AdminCrustFlavorOutput = Field(alias="crustFlavor")

    model_config = ConfigDict(populate_by_name=True)


class AdminMediaUploadResponse(BaseModel):
    file_name: str = Field(alias="fileName")
    media_path: str = Field(alias="mediaPath")
    public_url: str = Field(alias="publicUrl")
    image_key: str = Field(alias="imageKey")

    model_config = ConfigDict(populate_by_name=True)


class AdminMediaUsageProductOutput(BaseModel):
    id: int
    code: str
    name: str

    model_config = ConfigDict(populate_by_name=True)


class AdminMediaLibraryItemOutput(BaseModel):
    file_name: str = Field(alias="fileName")
    media_path: str = Field(alias="mediaPath")
    public_url: str = Field(alias="publicUrl")
    image_key: str = Field(alias="imageKey")
    used_by_count: int = Field(alias="usedByCount")
    used_by_products: list[AdminMediaUsageProductOutput] = Field(alias="usedByProducts")
    is_orphan: bool = Field(alias="isOrphan")
    file_size_bytes: int = Field(alias="fileSizeBytes")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminMediaLibraryResponse(BaseModel):
    items: list[AdminMediaLibraryItemOutput]

    model_config = ConfigDict(populate_by_name=True)


class AdminMediaDeleteResponse(BaseModel):
    detail: str
    file_name: str = Field(alias="fileName")

    model_config = ConfigDict(populate_by_name=True)
