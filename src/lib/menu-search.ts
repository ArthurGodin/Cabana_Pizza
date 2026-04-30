import type { Product } from "@/data/menu";

export function productMatchesQuery(product: Product, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeSearchText([
    product.name,
    product.description,
    product.category,
    product.group ?? "",
    ...(product.variants?.map((variant) => variant.label) ?? []),
  ].join(" "));

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
