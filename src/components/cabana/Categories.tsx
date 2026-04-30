import { motion } from "framer-motion";
import { categories, type Category } from "@/data/menu";

interface Props {
  active: Category | "Todos";
  onChange: (c: Category | "Todos") => void;
}

const all: Array<Category | "Todos"> = ["Todos", ...categories];

export function Categories({ active, onChange }: Props) {
  return (
    <div className="sticky top-16 md:top-20 z-30 -mx-5 md:mx-0 bg-background/85 backdrop-blur-xl border-b border-border/50">
      <div className="container py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
          {all.map((c) => {
            const isActive = active === c;
            return (
              <button
                key={c}
                onClick={() => onChange(c)}
                className="relative flex-shrink-0 px-5 h-10 rounded-full text-sm font-medium transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="cat-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-primary-gradient shadow-glow"
                  />
                )}
                {!isActive && (
                  <span className="absolute inset-0 rounded-full border border-border bg-surface/60" />
                )}
                <span className={`relative z-10 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
