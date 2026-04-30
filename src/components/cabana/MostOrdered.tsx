import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useMenuCatalog } from "@/contexts/menu-context";
import type { Product } from "@/data/menu";
import { formatBRL, getStartingPrice } from "@/store/cart";

interface Props {
  onAdd: (p: Product) => void;
}

export function MostOrdered({ onAdd }: Props) {
  const { products } = useMenuCatalog();
  const populars = products.filter((product) => product.popular);

  return (
    <section id="mais-pedidos" className="relative overflow-hidden bg-wood py-16 md:py-24">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="container relative">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
              <Flame className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Mais pedidos
              </span>
            </div>

            <h2 className="max-w-2xl text-balance font-display text-3xl font-semibold leading-[1.05] md:text-5xl">
              As preferidas de quem faz da pizza o melhor momento da noite.
            </h2>

            <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              Receitas que mais saem da cozinha para a mesa, escolhidas por quem quer pedir bem sem
              pensar demais.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-surface-elevated px-3.5 py-2 md:flex">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold">Da lenha para a sua mesa</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {populars.map((product, index) => (
            <motion.button
              key={product.id}
              onClick={() => onAdd(product)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.08, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-[1.15rem] border border-border/60 bg-card-gradient text-left shadow-card-soft transition-all duration-500 hover:shadow-elegant sm:rounded-3xl"
            >
              <div className="relative aspect-square overflow-hidden md:aspect-[4/5]">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

                {product.badge && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ember px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-glow sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[9px]">
                    <Flame className="h-2 w-2 sm:h-[10px] sm:w-[10px]" />
                    {product.badge}
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 md:p-4">
                  <h3 className="text-balance font-display text-[0.95rem] font-semibold leading-tight sm:text-base md:text-xl">
                    {product.name}
                  </h3>

                  <div className="mt-1.5 flex items-end justify-between gap-2 md:mt-2">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground md:text-[9px] md:tracking-[0.18em]">
                        A partir de
                      </p>
                      <p className="font-display text-base font-semibold sm:text-lg md:text-2xl">
                        {formatBRL(getStartingPrice(product))}
                      </p>
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-base font-light text-primary-foreground shadow-glow transition-transform group-hover:scale-105 md:h-10 md:w-10">
                      +
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
