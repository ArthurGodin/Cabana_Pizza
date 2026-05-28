import menuData from "@/data/menu.json";
import { getApiBaseUrl } from "@/lib/api-base-url";
import bacon from "@/assets/pizza-bacon.jpg";
import baiana from "@/assets/pizza-baiana.jpg";
import banana from "@/assets/pizza-banana.jpg";
import bananaNevada from "@/assets/pizza-banana-nevada.jpg";
import burrata from "@/assets/pizza-burrata.jpg";
import calabresa from "@/assets/pizza-calabresa.jpg";
import carneSeca from "@/assets/pizza-carne-seca.jpg";
import chocolate from "@/assets/pizza-chocolate.jpg";
import frangoBacon from "@/assets/pizza-frango-bacon.jpg";
import frangoCatupiry from "@/assets/pizza-frango-catupiry.jpg";
import margherita from "@/assets/pizza-margherita.jpg";
import mussarela from "@/assets/pizza-mussarela.jpg";
import pepperoni from "@/assets/pizza-pepperoni.jpg";
import portuguesa from "@/assets/pizza-portuguesa.jpg";
import quatroQueijos from "@/assets/pizza-quatro-queijos.jpg";
import romeuJulieta from "@/assets/pizza-romeu-julieta.jpg";
import truffle from "@/assets/pizza-truffle.jpg";
import drinkCoca from "@/assets/drink-coca.jpg";
import drinkCola from "@/assets/drink-cola.jpg";
import drinkHeineken from "@/assets/drink-heineken.jpg";
import drinkLemonade from "@/assets/drink-lemonade.jpg";
import drinkSuco from "@/assets/drink-suco.jpg";

export type Category = "Tradicional" | "Especial" | "Premium" | "Doce" | "Bebidas";
export type SizeKey = "P" | "M" | "G" | "GG";

export interface DrinkVariant {
  id: string;
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  image: string;
  priceP?: number;
  priceM?: number;
  priceG?: number;
  priceGG?: number;
  priceUnit?: number;
  isDrink?: boolean;
  popular?: boolean;
  badge?: string;
  group?: string;
  variants?: DrinkVariant[];
}

export interface RawSizeOption {
  key: SizeKey;
  label: string;
  slices: string;
}

export interface RawEdgeOption {
  id: string;
  name: string;
  description: string;
}

export interface RawPizzaItem {
  id: string;
  name: string;
  description: string;
  imageKey: string;
  popular?: boolean;
  badge?: string;
}

export interface RawDrinkVariant {
  id: string;
  label: string;
  price: number;
}

export interface RawDrinkItem {
  id: string;
  name: string;
  imageKey: string;
  variants: RawDrinkVariant[];
}

export interface RawPizzaCategory {
  id: string;
  label: Category;
  kind: "pizza";
  prices: Record<SizeKey, number>;
  items: RawPizzaItem[];
}

export interface RawDrinkGroup {
  name: string;
  items: RawDrinkItem[];
}

export interface RawDrinkCategory {
  id: string;
  label: "Bebidas";
  kind: "drink";
  groups: RawDrinkGroup[];
}

export interface RawMenuData {
  brand: {
    name: string;
    city: string;
    state: string;
    menuYear: number;
    whatsappNumber: string;
  };
  sizes: RawSizeOption[];
  edges: RawEdgeOption[];
  edgePriceBySize: Record<SizeKey, number>;
  deliveryNeighborhoods: string[];
  categories: Array<RawPizzaCategory | RawDrinkCategory>;
}

export interface MenuCatalog {
  rawMenu: RawMenuData;
  brand: RawMenuData["brand"];
  categories: Category[];
  sizeOptions: RawSizeOption[];
  edgeFlavors: RawEdgeOption[];
  edgePriceBySize: Record<SizeKey, number>;
  deliveryNeighborhoods: string[];
  products: Product[];
}

const imageMap = {
  bacon,
  baiana,
  banana,
  "banana-nevada": bananaNevada,
  burrata,
  calabresa,
  "carne-seca": carneSeca,
  chocolate,
  "frango-bacon": frangoBacon,
  "frango-catupiry": frangoCatupiry,
  margherita,
  mussarela,
  pepperoni,
  portuguesa,
  "quatro-queijos": quatroQueijos,
  "romeu-julieta": romeuJulieta,
  truffle,
  "drink-coca": drinkCoca,
  "drink-cola": drinkCola,
  "drink-heineken": drinkHeineken,
  "drink-lemonade": drinkLemonade,
  "drink-suco": drinkSuco,
};

export const imageAssetKeys = Object.keys(imageMap) as Array<keyof typeof imageMap>;
export const pizzaImageKeys = imageAssetKeys.filter((key) => !key.startsWith("drink-"));
export const drinkImageKeys = imageAssetKeys.filter((key) => key.startsWith("drink-"));

const pizzaDescriptionOverrides: Record<string, string> = {};

const drinkDescriptionOverrides: Record<string, string> = {
  "coca-cola": "Disponível em lata, 1 litro, 2 litros e versão Zero 1 litro.",
  "guarana-jesus": "Disponível em lata, 1 litro e 2 litros.",
  "fanta-laranja": "Disponível em lata, 1 litro e 2 litros.",
  guarana: "Disponível em lata, 1 litro e 2 litros.",
  "fanta-uva": "Disponível em lata e 2 litros.",
  heineken: "Cerveja premium servida bem gelada para acompanhar sua pizza.",
  stella: "Rótulo premium servido gelado para harmonizar com sabores marcantes.",
  spaten: "Malte equilibrado e temperatura ideal para acompanhar a noite.",
  "brahma-duplo-malte": "Duplo malte bem gelado para uma harmonização descomplicada.",
  "skol-puro-malte": "Puro malte leve e gelado para acompanhar sua escolha da casa.",
  bohemia: "Clássica, gelada e pronta para harmonizar com a sua pizza.",
  skol: "Cerveja leve e servida gelada para acompanhar o pedido.",
  brahma: "Tradição em versão gelada para completar a experiência.",
  bacuri: "Preparado na versão com leite ou sem leite, com o sabor marcante do bacuri.",
  cupuacu: "Preparado na versão com leite ou sem leite, com a cremosidade típica do cupuaçu.",
  maracuja: "Preparado na versão com leite ou sem leite, equilibrando frescor e aroma.",
  morango: "Preparado na versão com leite ou sem leite, com perfil leve e adocicado.",
  "abacaxi-com-hortela": "Preparado na versão com leite ou sem leite, com frescor de abacaxi e hortelã.",
  acerola: "Preparado na versão com leite ou sem leite, com acidez refrescante.",
  caja: "Preparado na versão com leite ou sem leite, com o sabor tropical do cajá.",
  caju: "Preparado na versão com leite ou sem leite, leve e refrescante.",
  goiaba: "Preparado na versão com leite ou sem leite, com sabor doce e suave.",
  cajuina: "Clássica e gelada, perfeita para acompanhar fatias e petiscos.",
  h2o: "Leve, cítrica e refrescante para completar o pedido.",
  "agua-mineral": "Disponível nas versões com gás ou sem gás.",
};

export const defaultRawMenuData = menuData as RawMenuData;
export const imageRegistry = imageMap;

export function buildMenuCatalog(rawMenu: RawMenuData): MenuCatalog {
  const brand = {
    ...rawMenu.brand,
    city: repairText(rawMenu.brand.city),
    state: repairText(rawMenu.brand.state),
  };

  const categories = rawMenu.categories.map((category) => repairText(category.label) as Category);

  const sizeOptions = rawMenu.sizes.map((size) => ({
    ...size,
    label: repairText(size.label),
    slices: repairText(size.slices),
  }));

  const edgeFlavors = rawMenu.edges.map((edge) => ({
    ...edge,
    name: repairText(edge.name),
    description: repairText(edge.description),
  }));

  const deliveryNeighborhoods = rawMenu.deliveryNeighborhoods.map(repairText);

  const products: Product[] = rawMenu.categories.flatMap((category) => {
    if (category.kind === "pizza") {
      return category.items.map<Product>((item) => ({
        id: item.id,
        name: repairText(item.name),
        description: resolvePizzaDescription(item),
        category: repairText(category.label) as Category,
        image: resolveImage(item.imageKey),
        priceP: category.prices.P,
        priceM: category.prices.M,
        priceG: category.prices.G,
        priceGG: category.prices.GG,
        popular: item.popular,
        badge: item.badge ? repairText(item.badge) : undefined,
      }));
    }

    return category.groups.flatMap((group) =>
      group.items.map<Product>((item) => {
        const variants = item.variants.map((variant) => ({
          ...variant,
          label: repairText(variant.label),
        }));
        const lowestPrice = Math.min(...variants.map((variant) => variant.price));

        return {
          id: item.id,
          name: repairText(item.name),
          description: buildDrinkDescription(group.name, item.id, variants),
          category: "Bebidas",
          image: resolveImage(item.imageKey),
          priceUnit: lowestPrice,
          isDrink: true,
          group: repairText(group.name),
          variants,
        };
      }),
    );
  });

  return {
    rawMenu,
    brand,
    categories,
    sizeOptions,
    edgeFlavors,
    edgePriceBySize: rawMenu.edgePriceBySize,
    deliveryNeighborhoods,
    products,
  };
}

export const defaultMenuCatalog = buildMenuCatalog(defaultRawMenuData);
export const brand = defaultMenuCatalog.brand;
export const categories = defaultMenuCatalog.categories;
export const sizeOptions = defaultMenuCatalog.sizeOptions;
export const edgeFlavors = defaultMenuCatalog.edgeFlavors;
export const edgePriceBySize = defaultMenuCatalog.edgePriceBySize;
export const deliveryNeighborhoods = defaultMenuCatalog.deliveryNeighborhoods;
export const products = defaultMenuCatalog.products;

function resolvePizzaDescription(item: RawPizzaItem) {
  return pizzaDescriptionOverrides[item.id] ?? repairText(item.description);
}

function buildDrinkDescription(groupName: string, itemId: string, variants: DrinkVariant[]) {
  if (drinkDescriptionOverrides[itemId]) {
    return drinkDescriptionOverrides[itemId];
  }

  const safeGroupName = repairText(groupName);
  const labels = variants.map((variant) => variant.label);

  if (safeGroupName === "Sucos") {
    return "Preparado na versão com leite ou sem leite.";
  }

  if (labels.length === 1 && labels[0] === "Unidade") {
    return "Disponível por unidade.";
  }

  return `Disponível em ${formatVariantLabels(labels)}.`;
}

function formatVariantLabels(labels: string[]) {
  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} e ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

function repairText(value: string) {
  if (!/[\u00C2\u00C3\u00E2]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
}

export function resolveImageSource(key: string, fallback: keyof typeof imageMap = "mussarela") {
  if (isLocalImageKey(key)) {
    return imageRegistry[key];
  }

  if (typeof key === "string" && key.startsWith("data:")) {
    return key;
  }

  if (typeof key === "string" && (key.startsWith("http://") || key.startsWith("https://"))) {
    return key;
  }

  if (typeof key === "string" && key.startsWith("/")) {
    return buildApiAssetUrl(key);
  }

  return imageRegistry[fallback];
}

function resolveImage(key: string) {
  return resolveImageSource(key);
}

function isLocalImageKey(value: string): value is keyof typeof imageMap {
  return value in imageRegistry;
}

function buildApiAssetUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
