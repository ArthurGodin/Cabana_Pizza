import { motion } from "framer-motion";
import { Clock, Flame, MapPin, MessageCircle } from "lucide-react";
import { useMenuCatalog } from "@/contexts/menu-context";
import { formatWhatsappDisplay } from "@/lib/phone";
import { storeHoursSummary } from "@/lib/store-hours";

export function SocialProof() {
  const { brand } = useMenuCatalog();
  const stats = [
    {
      icon: Clock,
      label: "Funcionamento",
      sub: storeHoursSummary,
    },
    {
      icon: Flame,
      label: "Forno a Lenha",
      sub: "O perfume da madeira e o calor da tradição em cada fornada.",
    },
    {
      icon: MapPin,
      label: "Entrega em Timon",
      sub: "Atendimento focado na cidade, com pedido montado para entrega ou retirada.",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp Oficial",
      sub: formatWhatsappDisplay(brand.whatsappNumber),
    },
  ] as const;

  return (
    <section className="border-y border-border/60 bg-surface/40 backdrop-blur">
      <div className="container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/30 p-3 md:border-0 md:bg-transparent md:p-0"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <stat.icon className="h-[14px] w-[14px] text-primary" strokeWidth={1.9} />
              </span>

              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
