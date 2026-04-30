import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { toast } from "sonner";
import { useMenuCatalog } from "@/contexts/menu-context";
import { getDeliveryCoverage } from "@/lib/delivery-coverage";
import { getShortOrderReference, submitOrder, type LoyaltySummary } from "@/lib/order-api";
import {
  buildOrderPayload,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  type CheckoutFormData,
  type CheckoutValidationErrors,
  validateCheckout,
} from "@/lib/order";
import {
  formatPostalCode,
  lookupPostalCode,
  mapPostalCodeAddress,
  normalizePostalCode,
} from "@/lib/postal-code";
import { formatBRL, type CartItem, useCart } from "@/store/cart";

interface Props {
  open: boolean;
  onEditItem: (item: CartItem) => void;
  onClose: () => void;
}

interface SubmittedOrderSummary {
  reference: string;
  publicId: string;
  totalLabel: string;
  createdAtLabel: string;
  customerName: string;
  whatsappUrl: string;
  trackingUrl: string;
  loyalty: LoyaltySummary | null;
}

export function CartSheet({ open, onEditItem, onClose }: Props) {
  const { brand, deliveryNeighborhoods } = useMenuCatalog();
  const {
    items,
    checkout,
    remove,
    increment,
    decrement,
    clear,
    updateCheckout,
    total,
    count,
  } = useCart();
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrderSummary | null>(null);

  const orderPayload = useMemo(
    () => buildOrderPayload({ form: checkout, items, total }),
    [checkout, items, total],
  );

  const deliveryCoverage = useMemo(
    () =>
      getDeliveryCoverage({
        checkout,
        city: brand.city,
        state: brand.state,
        neighborhoods: deliveryNeighborhoods,
      }),
    [brand.city, brand.state, checkout, deliveryNeighborhoods],
  );

  const handleSheetClose = () => {
    setSubmittedOrder(null);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setSubmittedOrder(null);
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSubmittedOrder(null);
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (items.length > 0 && errors.items) {
      setErrors((current) => {
        const next = { ...current };
        delete next.items;
        return next;
      });
    }
  }, [items.length, errors.items]);

  const handleFieldChange = (field: keyof CheckoutFormData, value: string) => {
    updateCheckout({ [field]: value } as Partial<CheckoutFormData>);

    setErrors((current) => {
      if (!current[field as keyof CheckoutValidationErrors]) {
        return current;
      }

      const next = { ...current };
      delete next[field as keyof CheckoutValidationErrors];
      return next;
    });
  };

  const handlePostalCodeChange = (value: string) => {
    handleFieldChange("postalCode", formatPostalCode(value));
  };

  const handlePostalCodeLookup = async () => {
    const normalized = normalizePostalCode(checkout.postalCode);

    if (normalized.length !== 8) {
      setErrors((current) => ({
        ...current,
        postalCode: "Informe um CEP válido com 8 dígitos.",
      }));
      return;
    }

    try {
      setCepLoading(true);
      const response = await lookupPostalCode(normalized);
      const address = mapPostalCodeAddress(response, deliveryNeighborhoods);

      updateCheckout({
        postalCode: address.postalCode,
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      });

      setErrors((current) => {
        const next = { ...current };
        delete next.postalCode;
        delete next.street;
        delete next.neighborhood;
        return next;
      });

      if (address.city && address.state) {
        toast.success(`Endereço localizado em ${address.city}/${address.state}.`);
      } else {
        toast.success("CEP localizado e dados principais preenchidos.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível consultar o CEP agora.";
      setErrors((current) => ({
        ...current,
        postalCode: message,
      }));
      toast.error(message);
    } finally {
      setCepLoading(false);
    }
  };

  const handleFinalize = async () => {
    const nextErrors = validateCheckout(checkout, items);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(nextErrors.items ?? "Preencha os dados obrigatórios antes de enviar o pedido.");
      return;
    }

    if (deliveryCoverage?.status === "unavailable") {
      toast.error(deliveryCoverage.description);
      return;
    }

    const message = buildWhatsAppMessage(orderPayload, formatBRL);
    const whatsappUrl = buildWhatsAppUrl(brand.whatsappNumber, message);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    toast.success("Pedido montado no WhatsApp para confirmação final.");
  };

  const handleSubmitAndSend = async () => {
    const nextErrors = validateCheckout(checkout, items);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(nextErrors.items ?? "Preencha os dados obrigatorios antes de enviar o pedido.");
      return;
    }

    if (deliveryCoverage?.status === "unavailable") {
      toast.error(deliveryCoverage.description);
      return;
    }

    const whatsappWindow = shouldOpenWhatsAppInCurrentTab() ? null : window.open("about:blank", "_blank");

    setSubmitting(true);

    try {
      const apiOrder = await submitOrder(orderPayload);
      const orderReference = getShortOrderReference(apiOrder.publicId);
      const trackingUrl = `${window.location.origin}/pedido/${apiOrder.publicId}`;
      const message = buildWhatsAppMessage(orderPayload, formatBRL, {
        orderReference,
        trackingUrl,
      });
      const whatsappUrl = buildWhatsAppUrl(brand.whatsappNumber, message);

      openWhatsAppOrderWindow({
        targetWindow: whatsappWindow,
        phone: brand.whatsappNumber,
        message,
      });

      setSubmittedOrder({
        reference: orderReference,
        publicId: apiOrder.publicId,
        totalLabel: formatBRL(Number(apiOrder.total)),
        createdAtLabel: formatOrderCreatedAt(apiOrder.createdAt),
        customerName: orderPayload.customer.name,
        whatsappUrl,
        trackingUrl,
        loyalty: apiOrder.loyalty,
      });
      toast.success(`Pedido ${orderReference} salvo na central e enviado para confirmacao.`);
      clear();
    } catch (error) {
      const message = buildWhatsAppMessage(orderPayload, formatBRL);

      openWhatsAppOrderWindow({
        targetWindow: whatsappWindow,
        phone: brand.whatsappNumber,
        message,
      });

      const detail =
        error instanceof Error ? error.message : "Nao foi possivel registrar o pedido na central.";

      toast.error(`${detail} Abrimos o WhatsApp para a loja nao perder o pedido.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSheetClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94svh] w-full flex-col rounded-t-[2rem] bg-surface-elevated shadow-sheet sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:max-w-md sm:rounded-none"
          >
            <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:h-16 sm:px-6 sm:py-0">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">
                  {submittedOrder ? "Pedido registrado" : "Seu pedido"}
                </h2>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {submittedOrder
                    ? "Seu protocolo do site ja esta pronto para acompanhamento."
                    : "Revise os itens e envie tudo pronto para o WhatsApp da loja."}
                </p>
              </div>

              <button
                onClick={handleSheetClose}
                aria-label="Fechar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:border-primary/60"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:px-6">
              {submittedOrder ? (
                <OrderSuccessState order={submittedOrder} />
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface">
                    <ShoppingBag className="h-7 w-7 text-muted-foreground" strokeWidth={1.4} />
                  </div>
                  <p className="font-display text-lg font-semibold">Carrinho vazio</p>
                  <p className="mt-1 max-w-[220px] text-sm text-muted-foreground">
                    Escolha suas pizzas, bebidas e adicionais. O pedido será montado aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <SectionTitle title="Itens do pedido" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {count} {count === 1 ? "item" : "itens"}
                      </span>
                    </div>

                    <ul className="space-y-3">
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <motion.li
                            key={item.uid}
                            layout
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="rounded-2xl border border-border/60 bg-surface p-3"
                          >
                            <div className="flex gap-3">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-xl object-cover"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-medium">{item.product.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {item.product.isDrink ? item.size : `Tamanho ${item.size}`}
                                      {!item.product.isDrink &&
                                        item.edge.id !== "none" &&
                                        ` · ${item.edge.name}`}
                                    </p>
                                    {item.note && (
                                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                        Observação: {item.note}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => onEditItem(item)}
                                      aria-label={`Editar ${item.product.name}`}
                                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-primary/60 hover:text-primary"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => remove(item.uid)}
                                      aria-label={`Remover ${item.product.name}`}
                                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-destructive/60 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <div className="inline-flex items-center rounded-full border border-border bg-background/80 p-1">
                                    <button
                                      onClick={() => decrement(item.uid)}
                                      aria-label={`Diminuir quantidade de ${item.product.name}`}
                                      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="min-w-[28px] text-center text-sm font-semibold">
                                      {item.qty}
                                    </span>
                                    <button
                                      onClick={() => increment(item.uid)}
                                      aria-label={`Aumentar quantidade de ${item.product.name}`}
                                      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      Total do item
                                    </p>
                                    <p className="font-display text-base font-semibold">
                                      {formatBRL(item.unitPrice * item.qty)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                    {errors.items && <FieldError message={errors.items} className="mt-3" />}
                  </section>

                  <section className="rounded-3xl border border-border/60 bg-surface px-4 py-4">
                    <SectionTitle title="Como deseja receber?" />

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <ChoiceButton
                        active={checkout.fulfillment === "delivery"}
                        label="Entrega"
                        description="Receber em Timon"
                        onClick={() => handleFieldChange("fulfillment", "delivery")}
                      />
                      <ChoiceButton
                        active={checkout.fulfillment === "pickup"}
                        label="Retirada"
                        description="Buscar na loja"
                        onClick={() => handleFieldChange("fulfillment", "pickup")}
                      />
                    </div>

                    {checkout.fulfillment === "pickup" && (
                      <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                        Vamos enviar o pedido pelo WhatsApp com o nome e telefone para a loja confirmar
                        o horário da retirada.
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl border border-border/60 bg-surface px-4 py-4">
                    <SectionTitle title="Seus dados" />

                    <div className="mt-3 space-y-3">
                      <Field
                        label="Nome"
                        value={checkout.customerName}
                        onChange={(value) => handleFieldChange("customerName", value)}
                        placeholder="Quem vai receber o pedido?"
                        error={errors.customerName}
                      />

                      <Field
                        label="Telefone / WhatsApp"
                        value={checkout.phone}
                        onChange={(value) => handleFieldChange("phone", value)}
                        placeholder="(99) 99999-9999"
                        error={errors.phone}
                        inputMode="tel"
                      />

                      {checkout.fulfillment === "delivery" && (
                        <>
                          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_112px]">
                            <Field
                              label="CEP"
                              value={checkout.postalCode}
                              onChange={handlePostalCodeChange}
                              onBlur={() => {
                                if (normalizePostalCode(checkout.postalCode).length === 8) {
                                  void handlePostalCodeLookup();
                                }
                              }}
                              placeholder="65630-000"
                              error={errors.postalCode}
                              inputMode="numeric"
                            />
                            <button
                              type="button"
                              onClick={() => void handlePostalCodeLookup()}
                              disabled={cepLoading}
                              className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-border bg-background/80 px-3 text-sm font-semibold transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60 min-[420px]:mt-[25px]"
                            >
                              {cepLoading ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                              Buscar
                            </button>
                          </div>

                          {deliveryCoverage && (
                            <CoverageNotice coverage={deliveryCoverage} />
                          )}

                          <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Bairro
                            </label>
                            <input
                              value={checkout.neighborhood}
                              onChange={(event) => handleFieldChange("neighborhood", event.target.value)}
                              placeholder="Ex.: Centro"
                              list="delivery-neighborhoods"
                              className={fieldClass(Boolean(errors.neighborhood))}
                            />
                            <datalist id="delivery-neighborhoods">
                              {deliveryNeighborhoods.map((neighborhood) => (
                                <option key={neighborhood} value={neighborhood} />
                              ))}
                            </datalist>
                            {errors.neighborhood && <FieldError message={errors.neighborhood} className="mt-1.5" />}
                          </div>

                          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_110px]">
                            <Field
                              label="Rua / Avenida"
                              value={checkout.street}
                              onChange={(value) => handleFieldChange("street", value)}
                              placeholder="Rua, avenida ou travessa"
                              error={errors.street}
                            />
                            <Field
                              label="Número"
                              value={checkout.number}
                              onChange={(value) => handleFieldChange("number", value)}
                              placeholder="123"
                              error={errors.number}
                            />
                          </div>

                          <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-3">
                            <Field
                              label="Cidade"
                              value={checkout.city}
                              onChange={(value) => handleFieldChange("city", value)}
                              placeholder={brand.city}
                              readOnly
                            />
                            <Field
                              label="UF"
                              value={checkout.state}
                              onChange={(value) => handleFieldChange("state", value)}
                              placeholder={brand.state}
                              readOnly
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field
                              label="Complemento"
                              value={checkout.complement}
                              onChange={(value) => handleFieldChange("complement", value)}
                              placeholder="Apto, casa, bloco..."
                            />
                            <Field
                              label="Referência"
                              value={checkout.reference}
                              onChange={(value) => handleFieldChange("reference", value)}
                              placeholder="Ponto de referência"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border/60 bg-surface px-4 py-4">
                    <SectionTitle title="Pagamento" />

                    <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                      <ChoiceButton
                        active={checkout.paymentMethod === "pix"}
                        label="Pix"
                        description="Chave enviada no WhatsApp"
                        onClick={() => handleFieldChange("paymentMethod", "pix")}
                      />
                      <ChoiceButton
                        active={checkout.paymentMethod === "money"}
                        label="Dinheiro"
                        description="Pagamento na entrega"
                        onClick={() => handleFieldChange("paymentMethod", "money")}
                      />
                      <ChoiceButton
                        active={checkout.paymentMethod === "card"}
                        label="Cartão"
                        description="Na entrega"
                        onClick={() => handleFieldChange("paymentMethod", "card")}
                      />
                    </div>

                    {checkout.paymentMethod === "money" && (
                      <div className="mt-3">
                        <Field
                          label="Troco para"
                          value={checkout.changeFor}
                          onChange={(value) => handleFieldChange("changeFor", value)}
                          placeholder="Ex.: 100"
                          inputMode="decimal"
                        />
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Observações gerais do pedido
                      </label>
                      <textarea
                        value={checkout.notes}
                        onChange={(event) => handleFieldChange("notes", event.target.value)}
                        rows={3}
                        placeholder="Sem cebola, ponto de referência, portaria, etc."
                        className={`${fieldClass(false)} resize-none py-3`}
                      />
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Fluxo operacional pronto</p>
                        <p className="mt-1">
                          Ao enviar, registramos o pedido na central e abrimos o WhatsApp da loja
                          endereço e forma de pagamento já organizados.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {submittedOrder ? (
              <footer className="space-y-3 border-t border-border bg-surface-elevated p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-6">
                <button
                  onClick={() =>
                    window.open(submittedOrder.whatsappUrl, "_blank", "noopener,noreferrer")
                  }
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 text-sm font-semibold text-primary-foreground shadow-elegant transition-shadow hover:shadow-glow"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir WhatsApp novamente
                </button>
                <button
                  onClick={handleSheetClose}
                  className="flex h-14 w-full items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold transition-colors hover:border-primary/60"
                >
                  Voltar ao cardapio
                </button>
              </footer>
            ) : items.length > 0 && (
              <footer className="space-y-4 border-t border-border bg-surface-elevated p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatBRL(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg">Total</span>
                  <span className="font-display text-2xl font-semibold">{formatBRL(total)}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={clear}
                    className="flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold transition-colors hover:border-primary/60"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={handleSubmitAndSend}
                    disabled={submitting}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 text-sm font-semibold text-primary-foreground shadow-elegant transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    {submitting ? "Registrando pedido..." : "Registrar e enviar"}
                  </button>
                </div>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function OrderSuccessState({ order }: { order: SubmittedOrderSummary }) {
  return (
    <div className="flex h-full flex-col justify-center py-10">
      <div className="rounded-[2rem] border border-border/60 bg-surface px-5 py-6 text-center shadow-sheet">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-300" strokeWidth={1.8} />
        </div>

        <h3 className="mt-5 font-display text-2xl font-semibold">Pedido salvo com sucesso</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          O pedido de {order.customerName} ja entrou na central da Cabana. O WhatsApp da loja foi
          aberto para voce concluir a confirmacao.
        </p>

        <div className="mt-6 space-y-3 rounded-3xl border border-border/60 bg-background/70 p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Protocolo
            </span>
            <span className="font-display text-xl font-semibold tracking-[0.18em]">
              {order.reference}
            </span>
          </div>

          <div className="h-px bg-border/60" />

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Total registrado
              </p>
              <p className="mt-1 font-display text-lg font-semibold">{order.totalLabel}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Horario
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{order.createdAtLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-left text-sm text-muted-foreground">
          Guarde o protocolo para acompanhar o andamento do pedido. O acompanhamento mostra apenas
          status e itens, sem expor endereco ou telefone.
        </div>

        {order.loyalty ? <LoyaltyProgressCard loyalty={order.loyalty} /> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href={order.trackingUrl}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background/80 px-4 text-sm font-semibold transition-colors hover:border-primary/60"
          >
            Acompanhar pedido
          </a>
          <a
            href={order.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground shadow-elegant"
          >
            Abrir WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function LoyaltyProgressCard({ loyalty }: { loyalty: LoyaltySummary }) {
  const percentage = Math.min(100, (loyalty.progressCount / 10) * 100);

  return (
    <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
        Cartao fidelidade
      </p>
      {loyalty.availableRewards > 0 ? (
        <p className="mt-2 text-sm text-emerald-50">
          Este telefone tem {loyalty.availableRewards} pizza gratis disponivel para resgate na loja.
        </p>
      ) : (
        <p className="mt-2 text-sm text-emerald-50">
          {loyalty.progressCount}/10 pizzas contabilizadas. Faltam {loyalty.pizzasUntilNextReward} para
          ganhar uma pizza gratis.
        </p>
      )}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/70">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function CoverageNotice({
  coverage,
}: {
  coverage: NonNullable<ReturnType<typeof getDeliveryCoverage>>;
}) {
  const tone =
    coverage.status === "covered"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : coverage.status === "unavailable"
        ? "border-destructive/40 bg-destructive/10 text-foreground"
        : "border-amber-500/30 bg-amber-500/10 text-amber-100";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${tone}`}>
      <p className="text-sm font-semibold">{coverage.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-current/80">{coverage.description}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {title}
    </h3>
  );
}

function ChoiceButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[72px] rounded-2xl border px-3 py-3 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 shadow-glow"
          : "border-border bg-background/70 hover:border-border/80"
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode,
  onBlur,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  onBlur?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        onBlur={onBlur}
        readOnly={readOnly}
        className={fieldClass(Boolean(error), readOnly)}
      />
      {error && <FieldError message={error} className="mt-1.5" />}
    </div>
  );
}

function FieldError({ message, className = "" }: { message: string; className?: string }) {
  return <p className={`text-xs text-destructive ${className}`}>{message}</p>;
}

function fieldClass(hasError: boolean, readOnly = false) {
  return `min-h-12 w-full rounded-2xl border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary ${
    hasError ? "border-destructive/70" : "border-border"
  } ${readOnly ? "cursor-default bg-surface text-muted-foreground" : ""}`;
}

function openWhatsAppOrderWindow({
  targetWindow,
  phone,
  message,
}: {
  targetWindow: Window | null;
  phone: string;
  message: string;
}) {
  const whatsappUrl = buildWhatsAppUrl(phone, message);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = whatsappUrl;
    return;
  }

  window.location.href = whatsappUrl;
}

function shouldOpenWhatsAppInCurrentTab() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
}

function formatOrderCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Agora mesmo";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
