import type { CheckoutFormData } from "@/lib/order";

export interface DeliveryCoverage {
  status: "covered" | "review" | "unavailable";
  title: string;
  description: string;
}

export function getDeliveryCoverage(input: {
  checkout: CheckoutFormData;
  city: string;
  state: string;
  neighborhoods: string[];
}) {
  const { checkout, city, state, neighborhoods } = input;

  if (checkout.fulfillment !== "delivery") {
    return null;
  }

  const cityMatches =
    !checkout.city || normalizeValue(checkout.city) === normalizeValue(city);
  const stateMatches =
    !checkout.state || normalizeValue(checkout.state) === normalizeValue(state);
  const neighborhoodKnown = neighborhoods.some(
    (item) => normalizeValue(item) === normalizeValue(checkout.neighborhood),
  );

  if ((checkout.city && !cityMatches) || (checkout.state && !stateMatches)) {
    return {
      status: "unavailable" as const,
      title: "Fora da área padrão de entrega",
      description: `No momento, o checkout está configurado para endereços em ${city}/${state}.`,
    };
  }

  if (
    checkout.postalCode.replace(/\D+/g, "").length === 8 &&
    checkout.street.trim() &&
    checkout.number.trim() &&
    checkout.city.trim() &&
    checkout.state.trim() &&
    neighborhoodKnown
  ) {
    return {
      status: "covered" as const,
      title: "Entrega validada para Timon",
      description: "Endereço pronto para envio. A loja só precisa confirmar prazo e valor final.",
    };
  }

  if (checkout.city.trim() && checkout.state.trim() && !neighborhoodKnown) {
    return {
      status: "review" as const,
      title: "Bairro precisa de conferência manual",
      description: "O endereço parece válido, mas o bairro ainda não bate com a base local da loja.",
    };
  }

  return {
    status: "review" as const,
    title: "Complete o endereço para validar a entrega",
    description: "CEP, rua, número e bairro ajudam a loja a confirmar a cobertura com mais rapidez.",
  };
}

function normalizeValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
