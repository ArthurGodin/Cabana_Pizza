import { describe, expect, it } from "vitest";
import type { Product } from "@/data/menu";
import { getDeliveryCoverage } from "@/lib/delivery-coverage";
import { productMatchesQuery } from "@/lib/menu-search";
import { getShortOrderReference } from "@/lib/order-api";
import {
  buildOrderPayload,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  checkoutDefaults,
  validateCheckout,
} from "@/lib/order";
import { formatPostalCode, mapPostalCodeAddress, normalizePostalCode } from "@/lib/postal-code";
import { formatBRL, replaceCartItem, upsertCartItems, type CartItem } from "@/store/cart";
import { getStoreStatus } from "@/lib/store-hours";

const pizzaProduct: Product = {
  id: "margherita",
  name: "Margherita",
  description: "Molho artesanal, mussarela premium, tomate e parmesao.",
  category: "Tradicional",
  image: "/mock/margherita.jpg",
  priceM: 36,
  priceG: 42,
  priceGG: 50,
};

const drinkProduct: Product = {
  id: "coca-cola",
  name: "Coca-Cola",
  description: "Refrigerante gelado.",
  category: "Bebidas",
  image: "/mock/coca.jpg",
  isDrink: true,
  priceUnit: 8,
  group: "Refrigerantes",
  variants: [{ id: "2l", label: "2L", price: 14 }],
};

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    uid: "item-1",
    product: pizzaProduct,
    size: "G",
    edge: { id: "none", name: "Sem borda recheada", price: 0 },
    note: "",
    unitPrice: 42,
    qty: 1,
    ...overrides,
  };
}

describe("operational order flow", () => {
  it("merges identical items when the same product is added twice", () => {
    const firstInsert = upsertCartItems([], {
      product: pizzaProduct,
      size: "G",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "",
      unitPrice: 42,
    });

    const merged = upsertCartItems(firstInsert, {
      product: pizzaProduct,
      size: "G",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "",
      unitPrice: 42,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(2);
  });

  it("keeps separate lines for different notes on the same item", () => {
    const firstInsert = upsertCartItems([], {
      product: pizzaProduct,
      size: "G",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "Sem cebola",
      unitPrice: 42,
    });

    const secondInsert = upsertCartItems(firstInsert, {
      product: pizzaProduct,
      size: "G",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "Bem assada",
      unitPrice: 42,
    });

    expect(secondInsert).toHaveLength(2);
  });

  it("keeps separate lines for different variants of the same product", () => {
    const firstInsert = upsertCartItems([], {
      product: drinkProduct,
      size: "Lata",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "",
      unitPrice: 8,
    });

    const secondInsert = upsertCartItems(firstInsert, {
      product: drinkProduct,
      size: "2L",
      edge: { id: "none", name: "Sem borda recheada", price: 0 },
      note: "",
      unitPrice: 14,
    });

    expect(secondInsert).toHaveLength(2);
  });

  it("updates an existing cart line without losing quantity", () => {
    const updated = replaceCartItem(
      [makeCartItem({ qty: 2 })],
      "item-1",
      {
        product: pizzaProduct,
        size: "GG",
        edge: { id: "cheddar", name: "Borda de cheddar", price: 15 },
        note: "Cortar em pedaços menores",
        unitPrice: 65,
      },
    );

    expect(updated[0]).toMatchObject({
      size: "GG",
      unitPrice: 65,
      qty: 2,
      note: "Cortar em pedaços menores",
    });
  });

  it("validates delivery checkout data before sending the order", () => {
    const errors = validateCheckout(
      {
        ...checkoutDefaults,
        customerName: "",
        phone: "9999",
        fulfillment: "delivery",
        postalCode: "",
      },
      [makeCartItem()],
    );

    expect(errors.customerName).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.postalCode).toBeTruthy();
    expect(errors.neighborhood).toBeTruthy();
    expect(errors.street).toBeTruthy();
    expect(errors.number).toBeTruthy();
  });

  it("builds a polished whatsapp message with sections, order reference and item notes", () => {
    const payload = buildOrderPayload({
      form: {
        ...checkoutDefaults,
        customerName: "Arthur",
        phone: "(99) 98259-9575",
        fulfillment: "delivery",
        postalCode: "65630-120",
        neighborhood: "Centro",
        street: "Rua da Lenha",
        number: "123",
        city: "Timon",
        state: "MA",
        reference: "Proximo a praca",
        paymentMethod: "pix",
        notes: "Tocar no portao ao chegar.",
      },
      items: [makeCartItem({ note: "Sem cebola." })],
      total: 42,
    });

    const message = buildWhatsAppMessage(payload, formatBRL, {
      orderReference: getShortOrderReference("d7824dfa-6e7a-4565-8234-6aa7dec522c6"),
    });
    const url = buildWhatsAppUrl("5599982599575", message);

    expect(message).toContain("Segue meu pedido para confirmacao:");
    expect(message).toContain("Protocolo no site: D7824DFA");
    expect(message).toContain("*ITENS DO PEDIDO*");
    expect(message).toContain("1. *Margherita*");
    expect(message).toContain("Quantidade: 1 unidade");
    expect(message).toContain("Observacao do item: Sem cebola.");
    expect(message).toContain("Valor: R$\u00a042");
    expect(message).toContain("*RESUMO DO PEDIDO*");
    expect(message).toContain("Total: *R$\u00a042*");
    expect(message).toContain("*DADOS DO CLIENTE*");
    expect(message).toContain("*ENTREGA*");
    expect(message).toContain("CEP: 65630-120");
    expect(message).toContain("Endereco: Rua da Lenha, 123");
    expect(message).toContain("Bairro: Centro");
    expect(message).toContain("Cidade/UF: Timon/MA");
    expect(message).toContain("*PAGAMENTO*");
    expect(message).toContain("Forma de pagamento: Pix");
    expect(message).toContain("*OBSERVACOES GERAIS*");
    expect(message).toContain("Fico no aguardo da confirmacao e do prazo estimado. Obrigado.");
    expect(url).toContain("wa.me/5599982599575");
    expect(url).toContain(encodeURIComponent("Ola, Cabana da Pizza."));
  });

  it("formats integer currency values without cents", () => {
    expect(formatBRL(42)).toBe("R$\u00a042");
    expect(formatBRL(42.5)).toBe("R$\u00a042,50");
  });

  it("formats and normalizes CEP values for lookup", () => {
    expect(normalizePostalCode("65.630-120")).toBe("65630120");
    expect(formatPostalCode("65630120")).toBe("65630-120");
  });

  it("maps ViaCEP data into the checkout address structure", () => {
    const mapped = mapPostalCodeAddress(
      {
        cep: "65630120",
        logradouro: "Rua da Lenha",
        bairro: "Centro",
        localidade: "Timon",
        uf: "MA",
      },
      ["Centro", "Parque Piaui"],
    );

    expect(mapped).toEqual({
      postalCode: "65630-120",
      street: "Rua da Lenha",
      neighborhood: "Centro",
      city: "Timon",
      state: "MA",
    });
  });

  it("matches products by normalized search terms", () => {
    expect(productMatchesQuery(pizzaProduct, "mussarela premium")).toBe(true);
    expect(productMatchesQuery(pizzaProduct, "parmesao")).toBe(true);
    expect(productMatchesQuery(pizzaProduct, "calabresa")).toBe(false);
  });

  it("flags delivery outside Timon as unavailable", () => {
    const coverage = getDeliveryCoverage({
      checkout: {
        ...checkoutDefaults,
        fulfillment: "delivery",
        postalCode: "65000-000",
        neighborhood: "Centro",
        street: "Rua Externa",
        number: "10",
        city: "Sao Luis",
        state: "MA",
      },
      city: "Timon",
      state: "MA",
      neighborhoods: ["Centro"],
    });

    expect(coverage?.status).toBe("unavailable");
  });

  it("reports the store as open on a monday evening", () => {
    const status = getStoreStatus(new Date("2026-04-27T22:00:00.000Z"));
    expect(status.isOpen).toBe(true);
    expect(status.label).toBe("Aberto agora");
  });

  it("reports the store as closed on tuesdays", () => {
    const status = getStoreStatus(new Date("2026-04-28T22:00:00.000Z"));
    expect(status.isOpen).toBe(false);
    expect(status.label).toBe("Fechado hoje");
  });
});
