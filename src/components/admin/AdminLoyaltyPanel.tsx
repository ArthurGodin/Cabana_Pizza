import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import {
  createAdminLoyaltyRedemption,
  fetchAdminLoyaltyCustomers,
  type AdminLoyaltySummary,
} from "@/lib/admin-api";

interface Props {
  token: string;
}

const LOYALTY_QUERY_KEY = ["admin", "loyalty"];

export function AdminLoyaltyPanel({ token }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminLoyaltySummary | null>(null);
  const [pizzaName, setPizzaName] = useState("");
  const [note, setNote] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const loyaltyQuery = useQuery({
    queryKey: [...LOYALTY_QUERY_KEY, deferredSearch],
    queryFn: () => fetchAdminLoyaltyCustomers(token, { search: deferredSearch, limit: 80 }),
    retry: false,
  });

  const redemptionMutation = useMutation({
    mutationFn: (customer: AdminLoyaltySummary) =>
      createAdminLoyaltyRedemption(token, {
        customerPhone: customer.customerPhone,
        customerName: customer.customerName,
        pizzaName: pizzaName.trim() || "Pizza gratis fidelidade",
        note: note.trim() || null,
      }),
    onSuccess: (response) => {
      toast.success("Resgate de fidelidade registrado.");
      setSelectedCustomer(response.summary);
      setPizzaName("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: LOYALTY_QUERY_KEY });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Nao foi possivel registrar o resgate.";
      toast.error(message);
    },
  });

  const customers = loyaltyQuery.data ?? [];
  const availableCustomers = customers.filter((customer) => customer.availableRewards > 0).length;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Cartao fidelidade</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">10 pizzas compradas, 1 pizza gratis</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              O sistema conta automaticamente pizzas de pedidos concluidos por telefone. Quando o cliente
              completar 10, a loja registra o resgate aqui para manter o controle.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LoyaltyMetric label="Clientes no programa" value={String(customers.length)} />
            <LoyaltyMetric label="Com resgate disponivel" value={String(availableCustomers)} />
          </div>
        </div>

        <label className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
          />
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl font-semibold">Clientes</h3>
            {loyaltyQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> : null}
          </div>

          {customers.length === 0 ? (
            <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum cliente com pizzas concluidas nesse filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <button
                  key={customer.customerPhone}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full rounded-3xl border p-4 text-left transition-colors ${
                    selectedCustomer?.customerPhone === customer.customerPhone
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-semibold">
                        {customer.customerName ?? "Cliente sem nome"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatPhone(customer.customerPhone)}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        customer.availableRewards > 0
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                          : "border-border bg-surface text-muted-foreground"
                      }`}
                    >
                      {customer.availableRewards > 0
                        ? `${customer.availableRewards} gratis`
                        : `${customer.progressCount}/10`}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (customer.progressCount / 10) * 100)}%` }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {customer.qualifyingPizzas} pizzas contabilizadas · {customer.redeemedRewards} resgates usados
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
          {selectedCustomer ? (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>

              <h3 className="mt-4 font-display text-2xl font-semibold">
                {selectedCustomer.customerName ?? "Cliente selecionado"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{formatPhone(selectedCustomer.customerPhone)}</p>

              <div className="mt-5 rounded-3xl border border-border/60 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Saldo de fidelidade
                </p>
                <p className="mt-2 font-display text-4xl font-semibold">
                  {selectedCustomer.availableRewards}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  pizzas gratis disponiveis agora.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Pizza entregue no resgate
                  </span>
                  <input
                    value={pizzaName}
                    onChange={(event) => setPizzaName(event.target.value)}
                    placeholder="Ex.: Mussarela G"
                    className={fieldClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Observacao interna
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex.: cliente retirou no balcao"
                    rows={3}
                    className={`${fieldClass()} resize-none`}
                  />
                </label>

                <button
                  onClick={() => redemptionMutation.mutate(selectedCustomer)}
                  disabled={selectedCustomer.availableRewards <= 0 || redemptionMutation.isPending}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 text-sm font-semibold text-primary-foreground shadow-elegant disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {redemptionMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Registrar resgate
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Gift className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-display text-2xl font-semibold">Selecione um cliente</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Escolha um cliente da lista para ver progresso, saldo e registrar pizza gratis.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function LoyaltyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function fieldClass() {
  return "w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary";
}

function formatPhone(value: string) {
  if (value.length === 11) {
    return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  }

  if (value.length === 10) {
    return `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
  }

  return value;
}
