import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CartSheet } from "@/components/cabana/CartSheet";
import { Header } from "@/components/cabana/Header";
import { Hero } from "@/components/cabana/Hero";
import { MenuCarouselSection } from "@/components/cabana/MenuCarouselSection";
import { MostOrdered } from "@/components/cabana/MostOrdered";
import { ProductSheet } from "@/components/cabana/ProductSheet";
import { SocialProof } from "@/components/cabana/SocialProof";
import { WhatsAppFab } from "@/components/cabana/WhatsAppFab";
import { useMenuCatalog } from "@/contexts/menu-context";
import { productMatchesQuery } from "@/lib/menu-search";
import { formatWhatsappDisplay } from "@/lib/phone";
import { storeHoursSummary } from "@/lib/store-hours";
import type { Product } from "@/data/menu";
import { CartProvider, type CartItem } from "@/store/cart";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function Page() {
  const { brand, products } = useMenuCatalog();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [returnToCart, setReturnToCart] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const menuSections = useMemo(() => {
    const byCategory = (category: string) =>
      products.filter((product) => !product.isDrink && product.category === category);
    const byGroup = (group: string) =>
      products.filter((product) => product.isDrink && product.group === group);

    const sections = [
      {
        id: "tradicionais",
        eyebrow: "Pizzas tradicionais",
        title: "Pizzas Tradicionais",
        description: "Os clássicos que nunca saem de moda. Simplicidade executada com perfeição.",
        products: byCategory("Tradicional"),
      },
      {
        id: "especiais",
        eyebrow: "Pizzas especiais",
        title: "Pizzas Especiais",
        description: "Combinações exclusivas para quem busca sair do comum.",
        products: byCategory("Especial"),
      },
      {
        id: "premium",
        eyebrow: "Pizzas premium",
        title: "Pizzas Premium",
        description: "Nossa assinatura gastronômica com ingredientes nobres.",
        products: byCategory("Premium"),
      },
      {
        id: "doces",
        eyebrow: "Pizzas doces",
        title: "Pizzas Doces",
        description: "Finalizações doces para transformar a última fatia em sobremesa.",
        products: byCategory("Doce"),
      },
      {
        id: "refrigerantes",
        eyebrow: "Bebidas",
        title: "Refrigerantes",
        description: "Escolha o formato ideal para acompanhar sua pizza do primeiro ao último pedaço.",
        products: byGroup("Refrigerantes"),
      },
      {
        id: "cervejas",
        eyebrow: "Bebidas",
        title: "Cervejas",
        description: "Rótulos bem gelados para harmonizar com sabores intensos e noites especiais.",
        products: byGroup("Cervejas"),
      },
      {
        id: "sucos",
        eyebrow: "Bebidas",
        title: "Sucos",
        description: "Sabores naturais preparados para acompanhar a refeição com leveza e frescor.",
        products: byGroup("Sucos"),
      },
    ];

    const others = byGroup("Outros");
    if (others.length > 0) {
      sections.push({
        id: "outros",
        eyebrow: "Bebidas",
        title: "Outros",
        description: "Complementos para fechar o pedido com a mesma atenção aos detalhes.",
        products: others,
      });
    }

    return sections.filter((section) => section.products.length > 0);
  }, [products]);

  const filteredSections = useMemo(() => {
    return menuSections
      .map((section) => ({
        ...section,
        products: section.products.filter((product) => productMatchesQuery(product, searchQuery)),
      }))
      .filter((section) => section.products.length > 0);
  }, [menuSections, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;
  const quickLinks = [
    {
      title: "Queridinhas da noite",
      description: "As mais pedidas para decidir rápido.",
      target: "mais-pedidos",
    },
    {
      title: "Premium da casa",
      description: "Receitas mais elaboradas e cheias de assinatura.",
      target: "premium",
    },
    {
      title: "Feche com doce",
      description: "Sabores para transformar o fim do pedido em sobremesa.",
      target: "doces",
    },
    {
      title: "Bebidas geladas",
      description: "Refrigerantes, cervejas e sucos para completar a mesa.",
      target: "refrigerantes",
    },
  ];

  const openProduct = (product: Product) => {
    setEditingItem(null);
    setReturnToCart(false);
    setSelectedProduct(product);
  };

  const handleEditItem = (item: CartItem) => {
    setEditingItem(item);
    setReturnToCart(true);
    setSelectedProduct(item.product);
    setCartOpen(false);
  };

  const handleCloseProduct = () => {
    const shouldReopenCart = returnToCart;
    setSelectedProduct(null);
    setEditingItem(null);
    setReturnToCart(false);

    if (shouldReopenCart) {
      setCartOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onCartClick={() => setCartOpen(true)} />

      <main>
        <Hero
          onOrder={() => scrollToSection("mais-pedidos")}
          onViewMenu={() => scrollToSection("menu")}
        />

        <SocialProof />

        <MostOrdered onAdd={openProduct} />

        <section id="menu" className="pb-28 pt-8 md:pb-24">
          <div className="container">
            <div className="mb-10 mt-8">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Cardápio completo
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-5xl">
                Sabores pensados para <span className="italic text-primary">cada momento da mesa.</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                Das receitas clássicas às combinações autorais, escolha sua pizza e complete o
                pedido com bebidas à altura da experiência.
              </p>
            </div>

            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
              {quickLinks.map((link) => (
                <button
                  key={link.target}
                  onClick={() => scrollToSection(link.target)}
                  className="group min-w-[78vw] rounded-3xl border border-border/60 bg-surface/80 p-4 text-left transition-all hover:border-primary/40 hover:bg-surface min-[420px]:min-w-[56vw] md:min-w-0"
                >
                  <p className="font-display text-lg font-semibold text-foreground">{link.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {link.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Ver seção
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-[2rem] border border-border/60 bg-surface/80 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Busca por sabor
                  </p>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Procure por ingrediente, sabor, bebida ou estilo para achar mais rápido o que
                    você quer pedir hoje.
                  </p>
                </div>

                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ex.: carne seca, cheddar, suco, chocolate..."
                    className="h-12 w-full rounded-full border border-border bg-background/90 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {hasSearch && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                  Busca atual: <span className="font-medium text-foreground">{searchQuery}</span>
                </span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-foreground transition-colors hover:border-primary/60"
                >
                  Limpar busca
                </button>
              </div>
            )}

            <div className="mt-10 space-y-14 md:space-y-16">
              {filteredSections.map((section) => (
                <MenuCarouselSection
                  key={section.id}
                  id={section.id}
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                  products={section.products}
                  onAdd={openProduct}
                />
              ))}
            </div>

            {hasSearch && filteredSections.length === 0 && (
              <div className="mt-10 rounded-[2rem] border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
                <p className="font-display text-2xl font-semibold">Nada encontrado nessa busca</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente pesquisar por outro ingrediente, sabor ou categoria.
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
          <p className="mb-1 font-display text-base text-foreground">Cabana da Pizza</p>
          <p>Tradição na lenha. Paciência na massa. Entrega em toda Timon.</p>
          <p className="mt-2">WhatsApp oficial: {formatWhatsappDisplay(brand.whatsappNumber)}</p>
          <p className="mt-1">{storeHoursSummary}</p>
          <p className="mt-3">© {new Date().getFullYear()} Cabana da Pizza · Todos os direitos reservados</p>
        </footer>
      </main>

      <ProductSheet
        product={selectedProduct}
        cartItem={editingItem}
        onClose={handleCloseProduct}
      />
      <CartSheet
        open={cartOpen}
        onEditItem={handleEditItem}
        onClose={() => setCartOpen(false)}
      />
      <WhatsAppFab onCartClick={() => setCartOpen(true)} />
    </div>
  );
}

export default function Index() {
  return (
    <CartProvider>
      <Page />
    </CartProvider>
  );
}
