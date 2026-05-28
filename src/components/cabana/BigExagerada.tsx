import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { useMenuCatalog } from "@/contexts/menu-context";
import { buildWhatsAppUrl } from "@/lib/order";

const BIG_EXAGERADA_PRICE = 650;
const BIG_EXAGERADA_LENGTH = "2 metros";
const BIG_EXAGERADA_INCLUDES = "6 refrigerantes";

export function BigExagerada() {
  const { brand } = useMenuCatalog();
  const whatsappUrl = buildWhatsAppUrl(
    brand.whatsappNumber,
    `Olá! Quero pedir a *Pizza Big Exagerada* (${BIG_EXAGERADA_LENGTH}, com ${BIG_EXAGERADA_INCLUDES}) — R$ ${BIG_EXAGERADA_PRICE}. Pode me passar os detalhes para combinar a entrega?`,
  );

  return (
    <section id="big-exagerada" className="container py-12 sm:py-16">
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-[#1a0f08] via-[#221610] to-[#2c1d14] p-6 shadow-elegant sm:p-10"
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

        {/* Giant background number */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 select-none font-display text-[12rem] font-bold leading-none tracking-tighter text-primary/5 sm:text-[16rem]"
        >
          2m
        </div>

        <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Edição especial
            </div>

            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Pizza <em className="italic text-primary">Big Exagerada</em>
            </h2>

            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Uma pizza de <strong className="text-foreground">2 metros</strong> com{" "}
              <strong className="text-foreground">6 refrigerantes</strong> inclusos. Para celebrações,
              confraternizações e mesas grandes — o tamanho que vira história.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                Até <strong className="text-foreground">40 fatias</strong>, ideal para grupos de 15 a 25 pessoas.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                Você escolhe os sabores na hora do pedido pelo WhatsApp.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                Acompanha <strong className="text-foreground">6 refrigerantes</strong> de sua escolha.
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-sm sm:p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Investimento único
              </p>
              <p className="mt-2 font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                <span className="align-top text-2xl text-muted-foreground sm:text-3xl">R$</span>{" "}
                {BIG_EXAGERADA_PRICE}
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Pedido exclusivo via WhatsApp
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Esse tamanho precisa de combinação prévia de horário e sabores. Fale com a gente
                direto no WhatsApp para garantir.
              </p>
            </div>

            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group flex h-12 items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 text-sm font-semibold text-primary-foreground shadow-elegant transition-shadow hover:shadow-glow"
            >
              <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2.2} />
              Pedir pelo WhatsApp
            </motion.a>

            <p className="text-center text-[11px] text-muted-foreground">
              Resposta em poucos minutos no horário de funcionamento.
            </p>
          </div>
        </div>
      </motion.article>
    </section>
  );
}
