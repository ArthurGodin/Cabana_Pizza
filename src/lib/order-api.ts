import type { OrderPayload } from "@/lib/order";
import { getApiBaseUrl } from "@/lib/api-base-url";

const ORDER_SUBMIT_TIMEOUT_MS = 12_000;

export interface OrderApiResponse {
  id: number;
  publicId: string;
  status: string;
  total: string;
  createdAt: string;
}

export async function submitOrder(payload: OrderPayload): Promise<OrderApiResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ORDER_SUBMIT_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        "A central demorou para responder. Verifique se a API esta ligada e acessivel no celular.",
      );
    }

    throw new Error(
      "Nao foi possivel conectar com a central. Verifique se a API esta ligada no PC e se o celular acessa a porta 8000.",
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(await readOrderApiError(response));
  }

  return (await response.json()) as OrderApiResponse;
}

export function getShortOrderReference(publicId: string) {
  return publicId.slice(0, 8).toUpperCase();
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readOrderApiError(response: Response) {
  try {
    const data = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>;
    };

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const messages = data.detail
        .map((issue) => issue?.msg?.trim())
        .filter((value): value is string => Boolean(value));

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  } catch {
    // Fall back to the generic message below.
  }

  return "Nao foi possivel registrar o pedido na central agora.";
}
