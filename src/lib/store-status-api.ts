import { getApiBaseUrl } from "@/lib/api-base-url";

export interface PublicStoreStatus {
  isOrderingPaused: boolean;
  pauseReason: string | null;
  acceptsOrders: boolean;
  updatedAt: string | null;
}

export async function fetchPublicStoreStatus() {
  const response = await fetch(`${getApiBaseUrl()}/api/store/status`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o status da loja.");
  }

  return (await response.json()) as PublicStoreStatus;
}
