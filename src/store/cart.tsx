import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product, SizeKey } from "@/data/menu";
import { buildCartItemSignature, checkoutDefaults, type CheckoutFormData } from "@/lib/order";

export interface CartItem {
  uid: string;
  product: Product;
  size: SizeKey | string;
  edge: { id: string; name: string; price: number };
  note?: string;
  unitPrice: number;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  checkout: CheckoutFormData;
  add: (item: Omit<CartItem, "uid" | "qty">) => void;
  updateItem: (uid: string, item: Omit<CartItem, "uid" | "qty">) => void;
  remove: (uid: string) => void;
  increment: (uid: string) => void;
  decrement: (uid: string) => void;
  clear: () => void;
  updateCheckout: (patch: Partial<CheckoutFormData>) => void;
  count: number;
  total: number;
  bump: number;
}

const Ctx = createContext<CartCtx | null>(null);
const CART_STORAGE_KEY = "cabana-cart-items";
const CHECKOUT_STORAGE_KEY = "cabana-checkout-form";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStorage(CART_STORAGE_KEY, []));
  const [checkout, setCheckout] = useState<CheckoutFormData>(() => ({
    ...checkoutDefaults,
    ...readStorage<Partial<CheckoutFormData>>(CHECKOUT_STORAGE_KEY, {}),
  }));
  const [bump, setBump] = useState(0);

  const add: CartCtx["add"] = useCallback((item) => {
    setItems((prev) => upsertCartItems(prev, item));
    setBump((current) => current + 1);
  }, []);

  const updateItem: CartCtx["updateItem"] = useCallback((uid, item) => {
    setItems((prev) => replaceCartItem(prev, uid, item));
  }, []);

  const remove = useCallback((uid: string) => {
    setItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const increment = useCallback((uid: string) => {
    setItems((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, qty: item.qty + 1 } : item)),
    );
    setBump((current) => current + 1);
  }, []);

  const decrement = useCallback((uid: string) => {
    setItems((prev) =>
      prev.flatMap((item) => {
        if (item.uid !== uid) {
          return [item];
        }

        if (item.qty <= 1) {
          return [];
        }

        return [{ ...item, qty: item.qty - 1 }];
      }),
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const updateCheckout = useCallback((patch: Partial<CheckoutFormData>) => {
    setCheckout((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    writeStorage(CART_STORAGE_KEY, items);
  }, [items]);

  useEffect(() => {
    writeStorage(CHECKOUT_STORAGE_KEY, checkout);
  }, [checkout]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      checkout,
      add,
      updateItem,
      remove,
      increment,
      decrement,
      clear,
      updateCheckout,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      total: items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
      bump,
    }),
    [items, checkout, add, updateItem, remove, increment, decrement, clear, updateCheckout, bump],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

export function getStartingPrice(product: Product): number {
  if (product.isDrink) {
    return product.priceUnit ?? 0;
  }

  return product.priceM ?? product.priceG ?? product.priceGG ?? 0;
}

export function upsertCartItems(items: CartItem[], incoming: Omit<CartItem, "uid" | "qty">) {
  const nextSignature = buildCartItemSignature(incoming);
  const existingItem = items.find((item) => buildCartItemSignature(item) === nextSignature);

  if (!existingItem) {
    return [
      ...items,
      {
        ...incoming,
        uid: `${incoming.product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        qty: 1,
      },
    ];
  }

  return items.map((item) =>
    item.uid === existingItem.uid ? { ...item, qty: item.qty + 1 } : item,
  );
}

export function replaceCartItem(
  items: CartItem[],
  uid: string,
  incoming: Omit<CartItem, "uid" | "qty">,
) {
  const currentItem = items.find((item) => item.uid === uid);

  if (!currentItem) {
    return items;
  }

  const nextSignature = buildCartItemSignature(incoming);
  const matchingItem = items.find(
    (item) => item.uid !== uid && buildCartItemSignature(item) === nextSignature,
  );

  if (matchingItem) {
    return items
      .filter((item) => item.uid !== uid)
      .map((item) =>
        item.uid === matchingItem.uid ? { ...item, qty: item.qty + currentItem.qty } : item,
      );
  }

  return items.map((item) =>
    item.uid === uid
      ? {
          ...item,
          ...incoming,
          qty: item.qty,
        }
      : item,
  );
}

function readStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in private mode or restricted environments.
  }
}
