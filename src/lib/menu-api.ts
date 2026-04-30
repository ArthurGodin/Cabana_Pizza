import type { RawMenuData } from "@/data/menu";
import { getApiBaseUrl } from "@/lib/api-base-url";

export async function fetchPublicMenu(): Promise<RawMenuData> {
  const response = await fetch(`${getApiBaseUrl()}/api/menu`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o cardapio do backend agora.");
  }

  return (await response.json()) as RawMenuData;
}
