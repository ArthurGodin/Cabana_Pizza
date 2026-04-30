import { getApiBaseUrl } from "@/lib/api-base-url";

const ADMIN_AUTH_STORAGE_KEY = "cabana.admin.accessToken";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isSuperuser: boolean;
  lastLoginAt: string | null;
}

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AdminUser;
}

export interface AdminOrderItem {
  id: number;
  productName: string;
  productOptionLabel: string | null;
  pizzaSize: string | null;
  crustName: string | null;
  note: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface AdminOrderEvent {
  id: number;
  eventType: "status_changed" | "status_undone" | string;
  previousStatus: AdminOrderStatus | null;
  nextStatus: AdminOrderStatus | null;
  adminUserId: number | null;
  adminUserName: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: number;
  publicId: string;
  status: AdminOrderStatus;
  previousStatus: AdminOrderStatus | null;
  canUndoStatusChange: boolean;
  statusChangedAt: string | null;
  customerName: string;
  customerPhone: string;
  fulfillmentType: "delivery" | "pickup";
  paymentMethod: "pix" | "money" | "card";
  changeFor: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  reference: string | null;
  subtotal: string;
  deliveryFee: string;
  total: string;
  notes: string | null;
  createdAt: string;
  items: AdminOrderItem[];
  events: AdminOrderEvent[];
  itemCount: number;
}

export interface AdminOrderFilters {
  limit?: number;
  status?: AdminOrderStatus | "all";
  fulfillment?: AdminOrder["fulfillmentType"] | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminOrdersDashboard {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  preparingOrders: number;
  outForDeliveryOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  deliveryOrders: number;
  pickupOrders: number;
  grossRevenue: string;
  completedRevenue: string;
  averageTicket: string;
  topProducts: AdminDashboardRankItem[];
  topNeighborhoods: AdminDashboardRankItem[];
  busyHours: AdminDashboardRankItem[];
}

export interface AdminDashboardRankItem {
  label: string;
  value: number;
}

export interface AdminLoyaltySummary {
  customerPhone: string;
  customerName: string | null;
  qualifyingPizzas: number;
  redeemedRewards: number;
  earnedRewards: number;
  availableRewards: number;
  progressCount: number;
  pizzasUntilNextReward: number;
}

export interface AdminLoyaltyRedemptionInput {
  customerPhone: string;
  customerName?: string | null;
  pizzaName?: string | null;
  orderId?: number | null;
  note?: string | null;
}

export interface AdminOrdersDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
}

export type AdminProductType = "pizza" | "drink";

export interface AdminCatalogProductOption {
  id: number;
  code: string;
  label: string;
  price: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCatalogProduct {
  id: number;
  categoryCode: string;
  categoryName: string;
  productType: AdminProductType;
  code: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  badgeText: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  options: AdminCatalogProductOption[];
}

export interface AdminCatalogCategory {
  id: number;
  code: string;
  name: string;
  productType: AdminProductType;
  isActive: boolean;
  sortOrder: number;
  products: AdminCatalogProduct[];
}

export interface AdminPizzaBasePrice {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  prices: {
    M: string;
    G: string;
    GG: string;
  };
}

export interface AdminCrustPrices {
  M: string;
  G: string;
  GG: string;
}

export interface AdminCrustFlavor {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCatalogData {
  categories: AdminCatalogCategory[];
  pizzaBasePrices: AdminPizzaBasePrice[];
  crustPrices: AdminCrustPrices;
  crustFlavors: AdminCrustFlavor[];
}

export interface AdminProductUpdateInput {
  name?: string;
  description?: string | null;
  imageKey?: string | null;
  badgeText?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminProductCreateInput {
  categoryCode: string;
  code?: string;
  name: string;
  description?: string | null;
  imageKey?: string | null;
  badgeText?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  initialOption?: {
    code?: string;
    label: string;
    price: number;
    isActive?: boolean;
    sortOrder?: number;
  } | null;
}

export interface AdminProductOptionUpdateInput {
  label?: string;
  price?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminProductOptionCreateInput {
  productId: number;
  code?: string;
  label: string;
  price: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminPizzaBasePriceUpdateInput {
  M: number;
  G: number;
  GG: number;
}

export interface AdminCrustFlavorUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminMediaUploadResponse {
  fileName: string;
  mediaPath: string;
  publicUrl: string;
  imageKey: string;
}

export interface AdminMediaUsageProduct {
  id: number;
  code: string;
  name: string;
}

export interface AdminMediaLibraryItem {
  fileName: string;
  mediaPath: string;
  publicUrl: string;
  imageKey: string;
  usedByCount: number;
  usedByProducts: AdminMediaUsageProduct[];
  isOrphan: boolean;
  fileSizeBytes: number;
  updatedAt: string;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function loginAdmin(input: { email: string; password: string }) {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new AdminApiError(await readApiError(response), response.status);
  }

  return (await response.json()) as AdminLoginResponse;
}

export async function fetchAdminMe(token: string) {
  return adminFetch<AdminUser>("/api/admin/me", token);
}

export async function fetchAdminOrders(token: string, limit = 20) {
  const data = await adminFetch<{ orders: AdminOrder[] }>(
    `/api/admin/orders${buildOrdersQueryString({ limit })}`,
    token,
  );
  return data.orders;
}

export async function fetchAdminOrdersWithFilters(token: string, filters: AdminOrderFilters) {
  const data = await adminFetch<{ orders: AdminOrder[] }>(
    `/api/admin/orders${buildOrdersQueryString(filters)}`,
    token,
  );
  return data.orders;
}

export async function fetchAdminOrdersDashboard(
  token: string,
  filters: AdminOrdersDashboardFilters,
) {
  return adminFetch<AdminOrdersDashboard>(
    `/api/admin/orders/dashboard${buildOrdersDashboardQueryString(filters)}`,
    token,
  );
}

export async function fetchAdminCatalog(token: string) {
  return adminFetch<AdminCatalogData>("/api/admin/catalog", token);
}

export async function fetchAdminLoyaltyCustomers(
  token: string,
  input: { search?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  if (typeof input.limit === "number") {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  const data = await adminFetch<{ customers: AdminLoyaltySummary[] }>(
    `/api/admin/loyalty${query ? `?${query}` : ""}`,
    token,
  );
  return data.customers;
}

export async function createAdminLoyaltyRedemption(
  token: string,
  input: AdminLoyaltyRedemptionInput,
) {
  return adminFetch<{ summary: AdminLoyaltySummary }>("/api/admin/loyalty/redemptions", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadAdminProductImage(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getApiBaseUrl()}/api/admin/media/product-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new AdminApiError(await readApiError(response), response.status);
  }

  return (await response.json()) as AdminMediaUploadResponse;
}

export async function fetchAdminProductMediaLibrary(token: string) {
  const data = await adminFetch<{ items: AdminMediaLibraryItem[] }>("/api/admin/media/products", token);
  return data.items;
}

export async function deleteAdminProductMedia(token: string, fileName: string) {
  return adminFetch<{ detail: string; fileName: string }>(
    `/api/admin/media/products/${encodeURIComponent(fileName)}`,
    token,
    {
      method: "DELETE",
    },
  );
}

export async function updateAdminOrderStatus(
  token: string,
  orderId: number,
  status: AdminOrderStatus,
) {
  const data = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${orderId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return data.order;
}

export async function undoAdminOrderStatus(token: string, orderId: number) {
  const data = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${orderId}/undo-status`, token, {
    method: "POST",
  });

  return data.order;
}

export async function createAdminProduct(token: string, input: AdminProductCreateInput) {
  const data = await adminFetch<{ product: AdminCatalogProduct }>("/api/admin/products", token, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return data.product;
}

export async function updateAdminProduct(
  token: string,
  productId: number,
  input: AdminProductUpdateInput,
) {
  const data = await adminFetch<{ product: AdminCatalogProduct }>(
    `/api/admin/products/${productId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return data.product;
}

export async function createAdminProductOption(
  token: string,
  input: AdminProductOptionCreateInput,
) {
  const data = await adminFetch<{ option: AdminCatalogProductOption }>(
    "/api/admin/product-options",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return data.option;
}

export async function updateAdminProductOption(
  token: string,
  optionId: number,
  input: AdminProductOptionUpdateInput,
) {
  const data = await adminFetch<{ option: AdminCatalogProductOption }>(
    `/api/admin/product-options/${optionId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return data.option;
}

export async function updateAdminPizzaBasePrices(
  token: string,
  categoryCode: string,
  input: AdminPizzaBasePriceUpdateInput,
) {
  const data = await adminFetch<{ priceTable: AdminPizzaBasePrice }>(
    `/api/admin/pizza-prices/${categoryCode}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return data.priceTable;
}

export async function updateAdminCrustPrices(token: string, input: AdminPizzaBasePriceUpdateInput) {
  const data = await adminFetch<{ crustPrices: AdminCrustPrices }>("/api/admin/crust-prices", token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return data.crustPrices;
}

export async function updateAdminCrustFlavor(
  token: string,
  crustFlavorId: number,
  input: AdminCrustFlavorUpdateInput,
) {
  const data = await adminFetch<{ crustFlavor: AdminCrustFlavor }>(
    `/api/admin/crust-flavors/${crustFlavorId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return data.crustFlavor;
}

export async function logoutAdmin(token: string) {
  await adminFetch<{ detail: string }>("/api/admin/logout", token, {
    method: "POST",
  });
}

export function readAdminToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
}

export function writeAdminToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, token);
}

export function clearAdminToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

async function adminFetch<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new AdminApiError(await readApiError(response), response.status);
  }

  return (await response.json()) as T;
}

async function readApiError(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // ignore
  }

  return "Nao foi possivel concluir a operacao agora.";
}

function buildOrdersQueryString(filters: AdminOrderFilters) {
  const params = new URLSearchParams();

  if (typeof filters.limit === "number") {
    params.set("limit", String(filters.limit));
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.fulfillment && filters.fulfillment !== "all") {
    params.set("fulfillment", filters.fulfillment);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function buildOrdersDashboardQueryString(filters: AdminOrdersDashboardFilters) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}
