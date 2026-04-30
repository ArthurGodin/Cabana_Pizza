import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { getStoreStatus, storeHoursSummary } from "@/lib/store-hours";

interface Props {
  onOrder: () => void;
  onViewMenu: () => void;
}

const LAYERS = [
  { id: "massa", src: "/layers/massa.png", alt: "Base da pizza" },
  { id: "molho", src: "/layers/molho.png", alt: "Molho de tomate" },
  { id: "queijo", src: "/layers/queijo.png", alt: "Camada de queijo" },
  { id: "recheio", src: "/layers/recheio.png", alt: "Cobertura final da pizza" },
] as const;

/*
Trigger anterior comentado para referencia:
- sequencia de 142 frames em /frames
- canvas com preload completo
- hero sticky com 220vh
- drawFrame(position) para interpolar a animacao por scroll

const TOTAL_FRAMES = 142;
const FRAME_STEP = 2;
const STICKY_SCROLL_VH = 220;
*/

export function Hero({ onOrder, onViewMenu }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [storeStatus, setStoreStatus] = useState(() => getStoreStatus());

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.42,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStoreStatus(getStoreStatus());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const stageScale = useTransform(progress, [0, 1], [0.88, 1]);
  const stageY = useTransform(progress, [0, 1], [12, 0]);
  const stageX = useTransform(progress, [0, 1], [22, 0]);
  const stageRotate = useTransform(progress, [0, 1], [-3, 0]);

  const massa = useLayerMotion(progress, 0.02, 0.22, -260, 0.88);
  const molho = useLayerMotion(progress, 0.2, 0.42, -220, 0.91);
  const queijo = useLayerMotion(progress, 0.4, 0.66, -180, 0.94);
  const recheio = useLayerMotion(progress, 0.62, 0.9, -140, 0.97);

  const heroScrollClass = reduceMotion ? "min-h-[100svh]" : "min-h-[100svh] md:h-[180svh]";

  return (
    <section ref={sectionRef} id="top" className={`relative bg-hero ${heroScrollClass}`}>
      <div className="sticky top-0 min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.97)_0%,rgba(12,10,9,0.88)_42%,rgba(12,10,9,0.58)_74%,rgba(12,10,9,0.94)_100%)] md:bg-[linear-gradient(90deg,rgba(12,10,9,0.96)_0%,rgba(12,10,9,0.86)_38%,rgba(12,10,9,0.42)_70%,rgba(12,10,9,0.18)_100%)]" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="container relative z-10 grid min-h-[100svh] content-center gap-6 pb-8 pt-20 sm:pt-24 md:grid-cols-[minmax(0,0.84fr)_minmax(420px,1.16fr)] md:items-center md:gap-4 md:py-24">
          <div className="order-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="mb-4 inline-flex max-w-full flex-col gap-1 rounded-2xl border border-border/80 bg-surface/60 px-3.5 py-2 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur sm:mb-6 sm:px-4 sm:text-[11px] sm:tracking-[0.2em]"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${storeStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-primary"}`}
                />
                {storeStatus.label}
              </span>
              <span className="tracking-[0.14em] text-muted-foreground/90">{storeStatus.detail}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.25, 1, 0.5, 1] }}
              className="text-balance font-display text-[clamp(2.75rem,12vw,4.5rem)] font-semibold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.8rem]"
            >
              A arte da pizza no
              <span className="block italic text-primary">fogo a lenha</span>
              agora no seu sofá.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
              className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0 md:mt-6 md:text-xl"
            >
              Massa de fermentação natural (48h), ingredientes premium e o toque defumado da
              lenha. O padrão das melhores pizzarias de SP, feito com paixão em Timon.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="mt-3 text-xs text-muted-foreground sm:text-sm"
            >
              {storeHoursSummary}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className="mt-6 flex flex-col justify-center gap-3 sm:flex-row md:mt-8 md:justify-start"
            >
              <button
                onClick={onOrder}
                className="group relative inline-flex h-12 w-full items-center justify-center rounded-full bg-primary-gradient px-7 text-sm font-semibold tracking-[0.02em] text-primary-foreground shadow-elegant transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-glow sm:h-[52px] sm:w-auto"
              >
                Quero minha pizza
                <span className="ml-2 text-sm transition-transform group-hover:translate-x-1">→</span>
              </button>

              <button
                onClick={onViewMenu}
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface/40 px-7 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/60 sm:h-[52px] sm:w-auto"
              >
                Explorar Sabores
              </button>
            </motion.div>
          </div>

          <motion.div
            style={{ scale: stageScale, x: stageX, y: stageY, rotate: stageRotate }}
            className="order-2 relative mx-auto flex h-[62vw] w-[62vw] max-h-[280px] max-w-[280px] items-center justify-center sm:h-[52vw] sm:w-[52vw] sm:max-h-[360px] sm:max-w-[360px] md:ml-auto md:mr-[-4vw] md:h-[58vw] md:w-[58vw] md:max-h-[620px] md:max-w-[620px] lg:mr-[-2vw] lg:h-[48vw] lg:w-[48vw]"
          >
            <div className="relative h-full w-full">
              <LayerImage layer={LAYERS[0]} motionStyle={massa} zIndexClass="z-10" />
              <LayerImage layer={LAYERS[1]} motionStyle={molho} zIndexClass="z-20" />
              <LayerImage layer={LAYERS[2]} motionStyle={queijo} zIndexClass="z-30" />
              <LayerImage layer={LAYERS[3]} motionStyle={recheio} zIndexClass="z-40" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute bottom-0 left-1 z-50 max-w-[min(82vw,18rem)] rounded-xl border border-border bg-surface-elevated/90 px-3 py-2 shadow-card-soft backdrop-blur-xl md:bottom-10 md:left-2 md:px-3.5 md:py-2.5"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Da massa ao forno
              </p>
              <p className="font-display text-base font-semibold leading-tight md:text-lg">
                Fermentação longa, molho artesanal e finalização na lenha
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function LayerImage({
  layer,
  motionStyle,
  zIndexClass,
}: {
  layer: (typeof LAYERS)[number];
  motionStyle: ReturnType<typeof useLayerMotion>;
  zIndexClass: string;
}) {
  return (
    <motion.img
      src={layer.src}
      alt={layer.alt}
      style={motionStyle}
      className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.24)] ${zIndexClass}`}
      loading="eager"
      decoding="async"
    />
  );
}

function useLayerMotion(
  progress: MotionValue<number>,
  start: number,
  end: number,
  offsetY: number,
  startScale: number,
) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [offsetY, 0]);
  const x = useTransform(progress, [start, end], [12, 0]);
  const scale = useTransform(progress, [start, end], [startScale, 1]);
  const filter = useTransform(progress, [start, end], ["blur(18px)", "blur(0px)"]);

  return { opacity, x, y, scale, filter };
}
