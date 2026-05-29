import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Home,
  Package,
  PackageCheck,
  Pizza,
  Truck,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  fetchOrderTracking,
  getShortOrderReference,
  type OrderTrackingResponse,
} from "@/lib/order-api";
import { readOrderHistory, type SavedOrder } from "@/lib/order-history";

export default function MyOrdersPage() {
  const savedOrders = useMemo(() => readOrderHistory(), []);

  return (
    <main className="min-h-screen bg-hero px-4 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Pizzaria Mesa 10
          </Link>
          <span className="rounded-full border border-border bg-surface/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Meus pedidos
          </span>
        </header>

        <section className="flex-1 rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Historico deste dispositivo
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Seus pedidos recentes
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Aqui aparecem os pedidos feitos neste aparelho. Toque em qualquer um
            para ver a linha do tempo completa e o status atualizado.
          </p>

          {savedOrders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-background/50 px-6 py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 font-display text-2xl font-semibold">
                Nenhum pedido por aqui
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Quando voce fizer seu primeiro pedido pelo site, ele vai
                aparecer aqui automaticamente para voce acompanhar a qualquer
                momento.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 text-sm font-semibold text-primary-foreground shadow-elegant"
              >
                Ver cardapio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {savedOrders.map((order) => (
                <OrderHistoryCard key={order.publicId} saved={order} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function OrderHistoryCard({ saved }: { saved: SavedOrder }) {
  const trackingQuery = useQuery({
    queryKey: ["order-tracking", saved.publicId],
    queryFn: () => fetchOrderTracking(saved.publicId),
    retry: 1,
    staleTime: 30_000,
  });

  const order = trackingQuery.data;
  const reference = getShortOrderReference(saved.publicId);
  const dateLabel = formatDateLabel(saved.createdAt);

  return (
    <li>
      <Link
        to={`/pedido/${saved.publicId}`}
        className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-surface"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${statusTone(order?.status)}`}
        >
          {statusIcon(order?.status)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              #{reference}
            </p>
            {order && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(order.status)}`}
              >
                {statusLabel(order.status)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {saved.customerName} · {saved.totalLabel} · {dateLabel}
          </p>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </Link>
    </li>
  );
}

function statusTone(status?: string) {
  if (!status) return "border-border bg-surface text-muted-foreground";
  const map: Record<string, string> = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    confirmed: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    preparing: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    out_for_delivery: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  return map[status] ?? "border-border bg-surface text-muted-foreground";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-200",
    confirmed: "bg-sky-500/15 text-sky-200",
    preparing: "bg-orange-500/15 text-orange-200",
    out_for_delivery: "bg-violet-500/15 text-violet-200",
    completed: "bg-emerald-500/15 text-emerald-200",
    cancelled: "bg-red-500/15 text-red-300",
  };
  return map[status] ?? "";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    out_for_delivery: "Na entrega",
    completed: "Concluido",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

function statusIcon(status?: string) {
  if (!status) return <Clock3 className="h-5 w-5" />;
  if (status === "pending") return <Clock3 className="h-5 w-5" />;
  if (status === "confirmed") return <CheckCircle2 className="h-5 w-5" />;
  if (status === "preparing") return <Pizza className="h-5 w-5" />;
  if (status === "out_for_delivery") return <Truck className="h-5 w-5" />;
  if (status === "completed") return <PackageCheck className="h-5 w-5" />;
  if (status === "cancelled") return <XCircle className="h-5 w-5" />;
  return <Package className="h-5 w-5" />;
}

function formatDateLabel(iso: string) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}
