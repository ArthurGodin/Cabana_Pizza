import { motion } from "framer-motion";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useMenuCatalog } from "@/contexts/menu-context";
import { buildWhatsAppUrl } from "@/lib/order";
import { useCart } from "@/store/cart";

interface Props {
  onCartClick: () => void;
}

export function WhatsAppFab({ onCartClick }: Props) {
  const { brand } = useMenuCatalog();
  const { count } = useCart();
  const genericWhatsAppUrl = buildWhatsAppUrl(
    brand.whatsappNumber,
    "Olá! Quero falar com a Cabana da Pizza sobre um pedido.",
  );

  const className =
    "group fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 md:bottom-8 md:right-8";
  const innerClassName =
    "relative flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-primary-gradient pl-3.5 pr-4 text-primary-foreground shadow-elegant";

  if (count > 0) {
    return (
      <motion.button
        onClick={onCartClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Revisar pedido"
        className={className}
      >
        <span className="absolute inset-0 rounded-full bg-primary/35 blur-xl transition-colors group-hover:bg-primary/50" />
        <span className={innerClassName}>
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.1} />
          <span className="hidden text-sm font-semibold sm:inline">Revisar pedido</span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.a
      href={genericWhatsAppUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      aria-label="Falar com a loja no WhatsApp"
      className={className}
    >
      <span className="absolute inset-0 rounded-full bg-primary/35 blur-xl transition-colors group-hover:bg-primary/50" />
      <span className={innerClassName}>
        <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2.1} />
        <span className="hidden text-sm font-semibold sm:inline">Falar no WhatsApp</span>
      </span>
    </motion.a>
  );
}
