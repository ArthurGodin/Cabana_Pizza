import type { Product } from "@/data/menu";

export type FulfillmentType = "delivery" | "pickup";
export type PaymentMethod = "pix" | "money" | "card";

export interface CheckoutFormData {
  customerName: string;
  phone: string;
  fulfillment: FulfillmentType;
  postalCode: string;
  neighborhood: string;
  street: string;
  number: string;
  city: string;
  state: string;
  complement: string;
  reference: string;
  paymentMethod: PaymentMethod;
  changeFor: string;
  notes: string;
}

export interface OrderItemLike {
  uid: string;
  product: Product;
  size: string;
  edge: { id: string; name: string; price: number };
  note?: string;
  unitPrice: number;
  qty: number;
}

export interface OrderPayload {
  channel: "site";
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  fulfillment: {
    type: FulfillmentType;
    postalCode: string | null;
    neighborhood: string | null;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    complement: string | null;
    reference: string | null;
  };
  payment: {
    method: PaymentMethod;
    changeFor: number | null;
  };
  items: Array<{
    id: string;
    productId: string;
    name: string;
    size: string;
    edge: { id: string; name: string; price: number } | null;
    note: string | null;
    unitPrice: number;
    qty: number;
    lineTotal: number;
  }>;
  summary: {
    itemCount: number;
    subtotal: number;
    total: number;
  };
  notes: string | null;
}

export type CheckoutValidationErrors = Partial<
  Record<
    | "items"
    | "customerName"
    | "phone"
    | "postalCode"
    | "neighborhood"
    | "street"
    | "number"
    | "paymentMethod",
    string
  >
>;

export const checkoutDefaults: CheckoutFormData = {
  customerName: "",
  phone: "",
  fulfillment: "delivery",
  postalCode: "",
  neighborhood: "",
  street: "",
  number: "",
  city: "",
  state: "",
  complement: "",
  reference: "",
  paymentMethod: "pix",
  changeFor: "",
  notes: "",
};

export function buildCartItemSignature(
  item: Pick<OrderItemLike, "product" | "size" | "edge" | "unitPrice" | "note">,
) {
  return [
    item.product.id,
    normalizeText(item.size),
    item.edge.id,
    item.unitPrice.toFixed(2),
    normalizeText(item.note ?? ""),
  ].join("::");
}

export function validateCheckout(
  form: CheckoutFormData,
  items: OrderItemLike[],
): CheckoutValidationErrors {
  const errors: CheckoutValidationErrors = {};

  if (items.length === 0) {
    errors.items = "Adicione ao menos um item ao carrinho.";
  }

  if (!form.customerName.trim()) {
    errors.customerName = "Informe o nome de quem vai receber o pedido.";
  }

  if (normalizePhone(form.phone).length < 10) {
    errors.phone = "Informe um telefone ou WhatsApp valido.";
  }

  if (form.fulfillment === "delivery") {
    if (form.postalCode.replace(/\D+/g, "").length !== 8) {
      errors.postalCode = "Informe um CEP valido para a entrega.";
    }

    if (!form.neighborhood.trim()) {
      errors.neighborhood = "Escolha o bairro da entrega.";
    }

    if (!form.street.trim()) {
      errors.street = "Informe a rua ou avenida da entrega.";
    }

    if (!form.number.trim()) {
      errors.number = "Informe o numero do endereco.";
    }
  }

  if (!form.paymentMethod) {
    errors.paymentMethod = "Escolha a forma de pagamento.";
  }

  return errors;
}

export function buildOrderPayload(input: {
  form: CheckoutFormData;
  items: OrderItemLike[];
  total: number;
}): OrderPayload {
  const { form, items, total } = input;

  return {
    channel: "site",
    createdAt: new Date().toISOString(),
    customer: {
      name: form.customerName.trim(),
      phone: normalizePhone(form.phone),
    },
    fulfillment: {
      type: form.fulfillment,
      postalCode: form.fulfillment === "delivery" ? safeTrim(form.postalCode) : null,
      neighborhood: form.fulfillment === "delivery" ? safeTrim(form.neighborhood) : null,
      street: form.fulfillment === "delivery" ? safeTrim(form.street) : null,
      number: form.fulfillment === "delivery" ? safeTrim(form.number) : null,
      city: form.fulfillment === "delivery" ? safeTrim(form.city) : null,
      state: form.fulfillment === "delivery" ? safeTrim(form.state) : null,
      complement: form.fulfillment === "delivery" ? safeTrim(form.complement) : null,
      reference: form.fulfillment === "delivery" ? safeTrim(form.reference) : null,
    },
    payment: {
      method: form.paymentMethod,
      changeFor: parseMoneyValue(form.changeFor),
    },
    items: items.map((item) => ({
      id: item.uid,
      productId: item.product.id,
      name: item.product.name,
      size: item.size,
      edge: item.edge.id === "none" ? null : item.edge,
      note: safeTrim(item.note ?? ""),
      unitPrice: item.unitPrice,
      qty: item.qty,
      lineTotal: item.unitPrice * item.qty,
    })),
    summary: {
      itemCount: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: total,
      total,
    },
    notes: safeTrim(form.notes),
  };
}

export function buildWhatsAppMessage(
  payload: OrderPayload,
  formatCurrency: (value: number) => string,
  options?: { orderReference?: string | null },
) {
  const lines = [
    "Ola, Cabana da Pizza.",
    "Segue meu pedido para confirmacao:",
    "",
    ...(options?.orderReference ? [`Protocolo no site: ${options.orderReference}`, ""] : []),
    "*ITENS DO PEDIDO*",
    ...payload.items.flatMap((item, index) => {
      const detailParts = [item.size];

      if (item.edge) {
        detailParts.push(`Borda ${item.edge.name}`);
      }

      const detailLabel = item.edge ? "Tamanho / borda" : "Opcao";
      const quantityLabel = item.qty === 1 ? "unidade" : "unidades";
      const itemLines = [
        `${index + 1}. *${item.name}*`,
        `   Quantidade: ${item.qty} ${quantityLabel}`,
        `   ${detailLabel}: ${detailParts.join(" | ")}`,
        `   Valor: ${formatCurrency(item.lineTotal)}`,
      ];

      if (item.note) {
        itemLines.push(`   Observacao do item: ${item.note}`);
      }

      itemLines.push("");
      return itemLines;
    }),
    "*RESUMO DO PEDIDO*",
    `Total: *${formatCurrency(payload.summary.total)}*`,
    "",
    "*DADOS DO CLIENTE*",
    `Nome: ${payload.customer.name}`,
    `WhatsApp: ${payload.customer.phone}`,
    "",
    `*${payload.fulfillment.type === "delivery" ? "ENTREGA" : "RETIRADA"}*`,
  ];

  if (payload.fulfillment.type === "delivery") {
    if (payload.fulfillment.postalCode) {
      lines.push(`CEP: ${payload.fulfillment.postalCode}`);
    }

    const addressLine = [payload.fulfillment.street, payload.fulfillment.number]
      .filter(Boolean)
      .join(", ");

    if (addressLine) {
      lines.push(`Endereco: ${addressLine}`);
    }

    if (payload.fulfillment.neighborhood) {
      lines.push(`Bairro: ${payload.fulfillment.neighborhood}`);
    }

    const cityState = [payload.fulfillment.city, payload.fulfillment.state]
      .filter(Boolean)
      .join("/");

    if (cityState) {
      lines.push(`Cidade/UF: ${cityState}`);
    }

    if (payload.fulfillment.complement) {
      lines.push(`Complemento: ${payload.fulfillment.complement}`);
    }

    if (payload.fulfillment.reference) {
      lines.push(`Referencia: ${payload.fulfillment.reference}`);
    }
  } else {
    lines.push("Vou retirar na loja.");
  }

  lines.push("", "*PAGAMENTO*", `Forma de pagamento: ${paymentMethodLabels[payload.payment.method]}`);

  if (payload.payment.method === "money") {
    lines.push(
      payload.payment.changeFor
        ? `Troco para: ${formatCurrency(payload.payment.changeFor)}`
        : "Troco: nao precisa",
    );
  }

  if (payload.notes) {
    lines.push("", "*OBSERVACOES GERAIS*", payload.notes);
  }

  lines.push("", "Fico no aguardo da confirmacao e do prazo estimado. Obrigado.");

  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

function parseMoneyValue(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function safeTrim(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  money: "Dinheiro",
  card: "Cartao na entrega",
};
