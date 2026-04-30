import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMenuCatalog } from "@/contexts/menu-context";
import { type Product, type SizeKey } from "@/data/menu";
import { formatBRL, type CartItem, useCart } from "@/store/cart";

interface Props {
  product: Product | null;
  cartItem?: CartItem | null;
  onClose: () => void;
}

export function ProductSheet({ product, cartItem = null, onClose }: Props) {
  const { edgeFlavors, edgePriceBySize, sizeOptions } = useMenuCatalog();
  const { add, updateItem } = useCart();
  const [size, setSize] = useState<SizeKey>("G");
  const [edgeId, setEdgeId] = useState("none");
  const [variantId, setVariantId] = useState("");
  const [note, setNote] = useState("");

  const availableSizes = useMemo(() => {
    if (!product || product.isDrink) {
      return [];
    }

    return sizeOptions.filter((option) => {
      const key = `price${option.key}` as "priceM" | "priceG" | "priceGG";
      return typeof product[key] === "number";
    });
  }, [product, sizeOptions]);

  const availableVariants = useMemo(() => {
    return product?.isDrink ? product.variants ?? [] : [];
  }, [product]);

  const selectedVariant = useMemo(
    () => availableVariants.find((variant) => variant.id === variantId) ?? availableVariants[0],
    [availableVariants, variantId],
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    if (product.isDrink) {
      const matchedVariant =
        product.variants?.find((variant) => variant.label === cartItem?.size) ?? product.variants?.[0];
      setVariantId(matchedVariant?.id ?? "");
      setEdgeId("none");
      setNote(cartItem?.note ?? "");
      return;
    }

    const editingSize = availableSizes.find((option) => option.key === cartItem?.size);
    const defaultSize =
      editingSize ?? availableSizes.find((option) => option.key === "G") ?? availableSizes[0];

    if (defaultSize) {
      setSize(defaultSize.key);
    }

    setEdgeId(cartItem?.edge.id ?? "none");
    setNote(cartItem?.note ?? "");
  }, [product, availableSizes, cartItem]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  if (!product) {
    return <AnimatePresence>{null}</AnimatePresence>;
  }

  const basePrice = product.isDrink
    ? selectedVariant?.price ?? product.priceUnit ?? 0
    : (product[`price${size}` as "priceM" | "priceG" | "priceGG"] ?? 0);

  const edgePrice = edgeId === "none" || product.isDrink ? 0 : edgePriceBySize[size];
  const edgeName = edgeFlavors.find((edge) => edge.id === edgeId)?.name ?? "Sem borda recheada";
  const total = basePrice + edgePrice;

  const handleSubmit = () => {
    const nextItem = {
      product,
      size: product.isDrink ? selectedVariant?.label ?? "Único" : size,
      edge: { id: edgeId, name: edgeName, price: edgePrice },
      note: note.trim(),
      unitPrice: total,
    };

    if (cartItem) {
      updateItem(cartItem.uid, nextItem);
    } else {
      add(nextItem);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-[70] flex h-[calc(100svh-0.75rem)] max-h-[780px] flex-col overflow-hidden rounded-t-[2rem] bg-surface-elevated shadow-sheet sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2"
        >
          <div className="flex shrink-0 justify-center bg-gradient-to-b from-surface-elevated to-surface-elevated/95 pb-2 pt-3">
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:border-primary/60"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:px-6">
            <div className="flex flex-col gap-4 min-[390px]:flex-row min-[390px]:items-start">
              <img
                src={product.image}
                alt={product.name}
                width={120}
                height={120}
                loading="eager"
                decoding="async"
                className="h-28 w-full rounded-2xl object-cover shadow-card-soft min-[390px]:h-24 min-[390px]:w-24 md:h-28 md:w-28"
              />

              <div className="min-w-0 flex-1 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {cartItem ? "Editando item do pedido" : product.isDrink ? product.group : product.category}
                </span>
                <h2 className="mt-1 font-display text-2xl font-semibold leading-tight md:text-3xl">
                  {product.name}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{product.description}</p>
              </div>
            </div>

            {product.isDrink ? (
              <Section title="Escolha a opção">
                <div className="space-y-2">
                  {availableVariants.map((variant) => {
                    const isActive = variant.id === selectedVariant?.id;

                    return (
                      <button
                        key={variant.id}
                        onClick={() => setVariantId(variant.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface hover:border-border/80"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isActive ? "border-primary" : "border-border"
                            }`}
                          >
                            {isActive && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </span>
                          <span className="truncate text-sm font-medium">{variant.label}</span>
                        </span>

                        <span className="ml-3 flex-shrink-0 text-sm font-semibold text-foreground">
                          {formatBRL(variant.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            ) : (
              <>
                <Section title="Tamanho">
                  <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-3">
                    {availableSizes.map((option) => {
                      const isActive = size === option.key;
                      const price =
                        product[`price${option.key}` as "priceM" | "priceG" | "priceGG"] ?? 0;

                      return (
                        <button
                          key={option.key}
                          onClick={() => setSize(option.key)}
                          className={`relative rounded-2xl border p-3 text-left transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 shadow-glow"
                              : "border-border bg-surface hover:border-border/80"
                          }`}
                        >
                          <p className="text-sm font-medium leading-tight">
                            {option.label}
                            <span className="ml-1 text-xs text-muted-foreground">{option.key}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{option.slices}</p>
                          <p className="mt-2 font-display text-sm font-semibold md:text-base">
                            {formatBRL(price)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Adicionais de borda">
                  <div className="space-y-2">
                    {edgeFlavors.map((edge) => {
                      const isActive = edgeId === edge.id;
                      const extra = edge.id === "none" ? 0 : edgePriceBySize[size];

                      return (
                        <button
                          key={edge.id}
                          onClick={() => setEdgeId(edge.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
                            isActive
                              ? "border-primary bg-primary/10"
                              : "border-border bg-surface hover:border-border/80"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3 text-left">
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                isActive ? "border-primary" : "border-border"
                              }`}
                            >
                              {isActive && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                            </span>

                            <span className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate text-sm font-medium">{edge.name}</span>
                              <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {edge.description}
                              </span>
                            </span>
                          </span>

                          <span className="ml-2 flex-shrink-0 text-sm text-muted-foreground">
                            {extra === 0 ? "Grátis" : `+ ${formatBRL(extra)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </>
            )}

            <Section title="Observação do item">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Ex.: sem cebola, bem assada, cortar em pedaços menores..."
                className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary"
              />
            </Section>
          </div>

          <div className="shrink-0 border-t border-border bg-surface-elevated/95 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur sm:px-6">
            <motion.button
              onClick={handleSubmit}
              whileTap={{ scale: 0.97 }}
              className="flex h-14 w-full items-center justify-between rounded-full bg-primary-gradient px-6 font-semibold text-primary-foreground shadow-elegant transition-shadow hover:shadow-glow"
            >
              <span>{cartItem ? "Atualizar item" : "Adicionar ao carrinho"}</span>
              <span className="font-display text-lg">{formatBRL(total)}</span>
            </motion.button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-7">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
