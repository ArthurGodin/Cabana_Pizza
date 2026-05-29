/**
 * Persists order public IDs in localStorage so the customer
 * can always find their recent orders without needing the
 * WhatsApp link. Keeps the last 20 orders max.
 */

const STORAGE_KEY = "mesa10.orders";
const MAX_ORDERS = 20;

export interface SavedOrder {
  publicId: string;
  customerName: string;
  totalLabel: string;
  createdAt: string; // ISO string
}

export function saveOrderToHistory(order: SavedOrder) {
  const current = readOrderHistory();
  // Avoid duplicates
  const filtered = current.filter((o) => o.publicId !== order.publicId);
  const next = [order, ...filtered].slice(0, MAX_ORDERS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function readOrderHistory(): SavedOrder[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasOrderHistory(): boolean {
  return readOrderHistory().length > 0;
}
