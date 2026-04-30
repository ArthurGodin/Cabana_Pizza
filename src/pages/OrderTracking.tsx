import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Home, PackageCheck, Pizza, Store, Truck, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { fetchOrderTracking, getShortOrderReference, type OrderTrackingResponse } from "@/lib/order-api";

const STATUS_FLOW = ["pending", "confirmed", "preparing", "out_for_delivery", "completed"] as const;

export default function OrderTrackingPage() {
  const { publicId = "" } = useParams();
  const trackingQuery = useQuery({
    queryKey: ["order-tracking", publicId],
    queryFn: () => fetchOrderTracking(publicId),
    enabled: Boolean(publicId),
    refetchInterval: 20_000,
    retry: 1,
  });

  return (
    <main className="min-h-screen bg-hero px-4 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Cabana da Pizza
          </Link>
          <span className="rounded-full border border-border bg-surface/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Acompanhamento
          </span>
        </header>

        <section className="flex-1 rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet sm:p-8">
          {trackingQuery.isLoading ? (
            <div className="flex min-h-[460px] items-center justify-center text-sm text-muted-foreground">
              Consultando pedido...
            </div>
          ) : trackingQuery.error || !trackingQuery.data ? (
            <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
              <XCircle className="h-12 w-12 text-primary" />
              <h1 className="mt-4 font-display text-3xl font-semibold">Pedido nao encontrado</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Confira se o link ou protocolo foi aberto corretamente. Se precisar, fale com a loja pelo WhatsApp.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-primary-gradient px-6 text-sm font-semibold text-primary-foreground shadow-elegant"
              >
                Voltar ao cardapio
              </Link>
            </div>
          ) : (
            <TrackingContent order={trackingQuery.data} />
          )}
        </section>
      </div>
    </main>
  );
}

function TrackingContent({ order }: { order: OrderTrackingResponse }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        Pedido {getShortOrderReference(order.publicId)}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">
        {order.customerFirstName}, seu pedido esta {statusPhrase(order.status)}.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Atualizamos esta pagina automaticamente. Ela mostra o andamento sem expor endereco, telefone ou dados sensiveis.
      </p>

      <div className="mt-6 rounded-3xl border border-border/60 bg-background/60 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TrackingMetric label="Status" value={statusLabel(order.status)} />
          <TrackingMetric label="Atendimento" value={order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"} />
          <TrackingMetric label="Total" value={formatCurrency(Number(order.total))} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border/60 bg-background/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Linha do tempo
        </p>
        <div className="mt-4 grid gap-3">
          {buildFlow(order).map((step) => {
            const state = stepState(order.status, step);
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                    state === "done"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : state === "current"
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {statusIcon(step)}
                </span>
                <div>
                  <p className={state === "current" ? "font-semibold text-foreground" : "text-sm text-muted-foreground"}>
                    {statusLabel(step)}
                  </p>
                  <p className="text-xs text-muted-foreground/80">{statusDescription(step, order.fulfillmentType)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border/60 bg-background/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Itens do pedido
        </p>
        <ul className="mt-3 divide-y divide-border/60">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex gap-3 py-3">
              <Pizza className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">
                  {item.quantity}x {item.name}
                </p>
                {item.option ? <p className="mt-1 text-xs text-muted-foreground">{item.option}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrackingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function buildFlow(order: OrderTrackingResponse) {
  if (order.status === "cancelled") {
    return ["pending", "confirmed", "cancelled"];
  }

  if (order.fulfillmentType === "pickup") {
    return STATUS_FLOW.filter((step) => step !== "out_for_delivery");
  }

  return [...STATUS_FLOW];
}

function stepState(current: string, step: string) {
  if (current === "cancelled") {
    return step === "cancelled" ? "current" : "upcoming";
  }

  const flow = [...STATUS_FLOW];
  const currentIndex = flow.indexOf(current as (typeof STATUS_FLOW)[number]);
  const stepIndex = flow.indexOf(step as (typeof STATUS_FLOW)[number]);

  if (stepIndex < currentIndex) {
    return "done";
  }

  return stepIndex === currentIndex ? "current" : "upcoming";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pedido recebido",
    confirmed: "Confirmado pela loja",
    preparing: "Em preparo",
    out_for_delivery: "Saiu para entrega",
    completed: "Concluido",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

function statusPhrase(status: string) {
  const labels: Record<string, string> = {
    pending: "aguardando confirmacao",
    confirmed: "confirmado",
    preparing: "em preparo",
    out_for_delivery: "a caminho",
    completed: "concluido",
    cancelled: "cancelado",
  };
  return labels[status] ?? "em acompanhamento";
}

function statusDescription(status: string, fulfillmentType: OrderTrackingResponse["fulfillmentType"]) {
  const descriptions: Record<string, string> = {
    pending: "A loja recebeu o pedido e ainda vai confirmar.",
    confirmed: "Pedido aceito e colocado na fila.",
    preparing: "A cozinha iniciou a producao.",
    out_for_delivery: "O pedido saiu para o endereco informado.",
    completed: fulfillmentType === "delivery" ? "Pedido entregue." : "Pedido retirado na loja.",
    cancelled: "Pedido cancelado pela operacao.",
  };
  return descriptions[status] ?? "";
}

function statusIcon(status: string) {
  if (status === "pending") return <Clock3 className="h-4 w-4" />;
  if (status === "confirmed") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "preparing") return <Pizza className="h-4 w-4" />;
  if (status === "out_for_delivery") return <Truck className="h-4 w-4" />;
  if (status === "completed") return <PackageCheck className="h-4 w-4" />;
  if (status === "cancelled") return <XCircle className="h-4 w-4" />;
  return <Store className="h-4 w-4" />;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
