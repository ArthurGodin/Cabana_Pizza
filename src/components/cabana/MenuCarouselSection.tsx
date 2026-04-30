import type { Product } from "@/data/menu";
import { ProductCard } from "@/components/cabana/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Props {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  products: Product[];
  onAdd: (product: Product) => void;
}

export function MenuCarouselSection({
  id,
  title,
  eyebrow,
  description,
  products,
  onAdd,
}: Props) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {eyebrow}
            </span>
          )}

          <h3 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-4xl">
            {title}
            <span className="ml-2 align-middle text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
              ({products.length})
            </span>
          </h3>

          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>
      </div>

      <Carousel opts={{ align: "start", dragFree: true }} className="relative">
        <CarouselContent className="-ml-3 md:-ml-5">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[47%] pl-3 min-[420px]:basis-[42%] sm:basis-[34%] md:basis-[32%] md:pl-5 lg:basis-[25%] xl:basis-[22%] 2xl:basis-[19%]"
            >
              <ProductCard product={product} onAdd={onAdd} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <p className="mt-3 text-xs text-muted-foreground md:hidden">
          Arraste para o lado e toque no + para montar seu pedido.
        </p>

        {products.length > 1 && (
          <>
            <CarouselPrevious className="left-auto right-12 top-[-4.25rem] hidden h-9 w-9 border-border/60 bg-surface/85 text-foreground backdrop-blur md:flex" />
            <CarouselNext className="right-0 top-[-4.25rem] hidden h-9 w-9 border-border/60 bg-surface/85 text-foreground backdrop-blur md:flex" />
          </>
        )}
      </Carousel>
    </section>
  );
}
