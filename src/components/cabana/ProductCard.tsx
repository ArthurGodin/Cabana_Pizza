import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Product } from "@/data/menu";
import { formatBRL, getStartingPrice } from "@/store/cart";

interface Props {
  product: Product;
  onAdd: (p: Product) => void;
}

export function ProductCard({ product, onAdd }: Props) {
  const priceLabel =
    product.isDrink && product.variants && product.variants.length === 1 ? "Preço" : "A partir de";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="group relative mx-auto flex h-full w-full max-w-[210px] flex-col overflow-hidden rounded-[1.15rem] border border-border/60 bg-card-gradient shadow-card-soft transition-all duration-500 hover:shadow-elegant sm:max-w-[240px] sm:rounded-3xl md:max-w-[260px] lg:max-w-[280px] xl:max-w-[290px] 2xl:max-w-[300px]"
    >
      <div className="relative aspect-square shrink-0 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={768}
          height={768}
          className="h-full w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-90" />

        {product.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-ember px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-glow sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[8px]">
            {product.badge}
          </span>
        )}
      </div>

      <div className="relative -mt-3 flex flex-1 flex-col p-2.5 sm:-mt-4 sm:p-3.5 md:-mt-5 md:p-4">
        <h3 className="min-h-[2.35rem] text-balance font-display text-[0.95rem] font-semibold leading-tight line-clamp-2 sm:min-h-[2.75rem] sm:text-base md:min-h-[3.4rem] md:text-lg xl:text-[1.15rem]">
          {product.name}
        </h3>
        <p className="mt-1 min-h-[2rem] text-[10px] leading-snug text-muted-foreground line-clamp-2 sm:mt-1.5 sm:min-h-[2.25rem] sm:text-[11px] md:text-[13px]">
          {product.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5 sm:pt-3.5">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">
              {priceLabel}
            </span>
            <span className="font-display text-base font-semibold text-foreground sm:text-lg md:text-xl xl:text-[1.45rem]">
              {formatBRL(getStartingPrice(product))}
            </span>
          </div>

          <motion.button
            onClick={() => onAdd(product)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            aria-label={`Adicionar ${product.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground shadow-elegant hover:shadow-glow sm:h-11 sm:w-11"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" strokeWidth={2.3} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
