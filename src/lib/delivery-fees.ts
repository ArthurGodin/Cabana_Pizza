import type { CheckoutFormData } from "@/lib/order";

export interface DemoDeliveryFee {
  neighborhood: string;
  fee: number;
}

export const DEFAULT_DEMO_DELIVERY_FEE = 8;

export const DEMO_DELIVERY_FEES: DemoDeliveryFee[] = [
  { neighborhood: "Centro", fee: 6 },
  { neighborhood: "Santo Antônio", fee: 7 },
  { neighborhood: "Cidade Nova", fee: 9 },
  { neighborhood: "Parque Piauí I", fee: 8 },
  { neighborhood: "Parque Piauí II", fee: 8 },
  { neighborhood: "Parque Alvorada", fee: 9 },
  { neighborhood: "Parque São Francisco", fee: 10 },
  { neighborhood: "Parque São Francisco II", fee: 10 },
  { neighborhood: "Parque União", fee: 10 },
  { neighborhood: "Boa Vista", fee: 9 },
  { neighborhood: "Conjunto Boa Vista", fee: 10 },
  { neighborhood: "Coheb", fee: 8 },
  { neighborhood: "Formosa", fee: 10 },
  { neighborhood: "Planalto Formosa", fee: 11 },
  { neighborhood: "Flores", fee: 12 },
  { neighborhood: "Reserva das Flores", fee: 12 },
  { neighborhood: "Guarita", fee: 8 },
  { neighborhood: "Mateuzinho", fee: 10 },
  { neighborhood: "Parque Aliança", fee: 11 },
  { neighborhood: "Pedro Patrício", fee: 12 },
  { neighborhood: "Mutirão", fee: 10 },
  { neighborhood: "Centro Operário", fee: 9 },
  { neighborhood: "Loteamento Boa Vista", fee: 11 },
  { neighborhood: "Novo Joia", fee: 12 },
];

const feeByNeighborhood = new Map(
  DEMO_DELIVERY_FEES.map((item) => [normalizeNeighborhood(item.neighborhood), item.fee]),
);

export function calculateDemoDeliveryFee(checkout: CheckoutFormData) {
  if (checkout.fulfillment !== "delivery") {
    return 0;
  }

  const neighborhood = normalizeNeighborhood(checkout.neighborhood);

  if (!neighborhood) {
    return 0;
  }

  return feeByNeighborhood.get(neighborhood) ?? DEFAULT_DEMO_DELIVERY_FEE;
}

export function normalizeNeighborhood(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
