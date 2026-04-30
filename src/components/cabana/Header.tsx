import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

interface Props {
  onCartClick: () => void;
}

export function Header({ onCartClick }: Props) {
  const { count, bump } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled ? "border-b border-border/60 bg-background/70 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="container flex h-14 items-center justify-between pt-[env(safe-area-inset-top)] sm:h-16 md:h-20">
        <a href="#top" className="group flex items-center gap-2">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-gradient shadow-glow md:h-9 md:w-9">
            <span className="font-display text-base font-bold leading-none text-primary-foreground md:text-lg">
              C
            </span>
          </span>

          <div className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold tracking-tight md:text-lg">
              Cabana
            </span>
            <span className="-mt-0.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:text-xs">
              da Pizza
            </span>
          </div>
        </a>

        <motion.button
          onClick={onCartClick}
          aria-label="Abrir carrinho"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface-elevated transition-colors hover:border-primary/60 md:h-11 md:w-11"
          key={bump}
          animate={bump > 0 ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ShoppingBag className="h-[17px] w-[17px] text-foreground md:h-[18px] md:w-[18px]" strokeWidth={1.7} />

          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-glow"
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </header>
  );
}
