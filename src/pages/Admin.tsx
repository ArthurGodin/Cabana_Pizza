import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  BellRing,
  LogOut,
  MapPin,
  PauseCircle,
  Phone,
  PlayCircle,
  Power,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AdminApiError,
  clearAdminToken,
  fetchAdminMe,
  fetchAdminOrdersDashboard,
  fetchAdminOrdersWithFilters,
  fetchAdminStoreStatus,
  loginAdmin,
  logoutAdmin,
  readAdminToken,
  undoAdminOrderStatus,
  updateAdminStoreStatus,
  updateAdminOrderStatus,
  writeAdminToken,
  type AdminOrder,
  type AdminOrderFilters,
  type AdminOrderStatus,
  type AdminOrdersDashboard,
  type AdminOrdersDashboardFilters,
  type StoreStatus,
} from "@/lib/admin-api";
import { AdminCatalogPanel } from "@/components/admin/AdminCatalogPanel";

const ME_QUERY_KEY = ["admin", "me"];
const ORDERS_QUERY_KEY = ["admin", "orders"];
const DASHBOARD_QUERY_KEY = ["admin", "orders-dashboard"];
const NEW_ORDERS_WATCH_QUERY_KEY = ["admin", "new-orders-watch"];
const STORE_STATUS_QUERY_KEY = ["admin", "store-status"];

type AdminDatePreset = "today" | "yesterday" | "last7" | "custom" | "all";
type OrdersMode = "list" | "kitchen";
type DashboardStats = AdminOrdersDashboard & {
  activeOrders: number;
  grossRevenueNumber: number;
  completedRevenueNumber: number;
  activeRevenueNumber: number;
  cancelledRevenueNumber: number;
  averageTicketNumber: number;
};

const DATE_FILTER_OPTIONS: Array<{ value: AdminDatePreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last7", label: "7 dias" },
  { value: "custom", label: "Periodo" },
  { value: "all", label: "Tudo" },
];

const EMPTY_DASHBOARD: AdminOrdersDashboard = {
  totalOrders: 0,
  validOrders: 0,
  pendingOrders: 0,
  confirmedOrders: 0,
  preparingOrders: 0,
  outForDeliveryOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  deliveryOrders: 0,
  pickupOrders: 0,
  grossRevenue: "0",
  completedRevenue: "0",
  activeRevenue: "0",
  cancelledRevenue: "0",
  averageTicket: "0",
  topProducts: [],
  topNeighborhoods: [],
  busyHours: [],
  revenueByStatus: [],
};

const STATUS_FILTER_OPTIONS: Array<{ value: AdminOrderStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "preparing", label: "Preparando" },
  { value: "out_for_delivery", label: "Na entrega" },
  { value: "completed", label: "Concluidos" },
  { value: "cancelled", label: "Cancelados" },
];

const FULFILLMENT_FILTER_OPTIONS: Array<{
  value: AdminOrder["fulfillmentType"] | "all";
  label: string;
}> = [
  { value: "all", label: "Entrega e retirada" },
  { value: "delivery", label: "Somente entrega" },
  { value: "pickup", label: "Somente retirada" },
];

const KITCHEN_COLUMNS: Array<{
  status: AdminOrderStatus;
  title: string;
  tone: "amber" | "sky" | "orange" | "violet";
}> = [
  { status: "pending", title: "Novos", tone: "amber" },
  { status: "confirmed", title: "Confirmados", tone: "sky" },
  { status: "preparing", title: "Em preparo", tone: "orange" },
  { status: "out_for_delivery", title: "Na entrega", tone: "violet" },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const latestSeenOrderIdRef = useRef<number | null>(null);
  const [token, setToken] = useState<string | null>(() => readAdminToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "all">("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<AdminOrder["fulfillmentType"] | "all">(
    "all",
  );
  const [searchInput, setSearchInput] = useState("");
  const [datePreset, setDatePreset] = useState<AdminDatePreset>("today");
  const [customDateFrom, setCustomDateFrom] = useState(() => toDateInput(new Date()));
  const [customDateTo, setCustomDateTo] = useState(() => toDateInput(new Date()));
  const [ordersMode, setOrdersMode] = useState<OrdersMode>("list");
  const [orderFeedbacks, setOrderFeedbacks] = useState<
    Partial<
      Record<
        number,
        {
          tone: "success" | "info";
          message: string;
        }
      >
    >
  >({});
  const [activeView, setActiveView] = useState<"orders" | "catalog">("orders");

  const deferredSearch = useDeferredValue(searchInput.trim());
  const dateRange = useMemo<AdminOrdersDashboardFilters>(
    () => buildDateRange(datePreset, customDateFrom, customDateTo),
    [customDateFrom, customDateTo, datePreset],
  );
  const periodLabel = useMemo(
    () => buildPeriodLabel(datePreset, dateRange),
    [datePreset, dateRange],
  );

  const orderFilters = useMemo<AdminOrderFilters>(
    () => ({
      limit: ordersMode === "kitchen" ? 100 : 50,
      status: ordersMode === "list" ? statusFilter : "all",
      fulfillment: fulfillmentFilter,
      search: deferredSearch,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    }),
    [dateRange.dateFrom, dateRange.dateTo, deferredSearch, fulfillmentFilter, ordersMode, statusFilter],
  );

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      writeAdminToken(data.accessToken);
      setToken(data.accessToken);
      setPassword("");
      toast.success(`Acesso liberado para ${data.user.name}.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Nao foi possivel entrar no painel.";
      toast.error(message);
    },
  });

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => fetchAdminMe(token as string),
    enabled: Boolean(token),
    retry: false,
  });

  const ordersQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, orderFilters],
    queryFn: () => fetchAdminOrdersWithFilters(token as string, orderFilters),
    enabled: Boolean(token),
    retry: false,
  });

  const dashboardQuery = useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, dateRange],
    queryFn: () => fetchAdminOrdersDashboard(token as string, dateRange),
    enabled: Boolean(token) && activeView === "orders",
    retry: false,
  });

  const storeStatusQuery = useQuery({
    queryKey: STORE_STATUS_QUERY_KEY,
    queryFn: () => fetchAdminStoreStatus(token as string),
    enabled: Boolean(token) && activeView === "orders",
    retry: false,
  });

  const newOrdersWatchQuery = useQuery({
    queryKey: NEW_ORDERS_WATCH_QUERY_KEY,
    queryFn: () =>
      fetchAdminOrdersWithFilters(token as string, {
        limit: 10,
        dateFrom: toDateInput(new Date()),
        dateTo: toDateInput(new Date()),
      }),
    enabled: Boolean(token) && activeView === "orders",
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (input: { orderId: number; status: AdminOrderStatus }) =>
      updateAdminOrderStatus(token as string, input.orderId, input.status),
    onSuccess: (updatedOrder) => {
      setOrderFeedbacks((current) => ({
        ...current,
        [updatedOrder.id]: {
          tone: updatedOrder.canUndoStatusChange ? "info" : "success",
          message: updatedOrder.canUndoStatusChange
            ? `Status atualizado para ${statusLabel(updatedOrder.status)}. Se precisar, ainda da para desfazer por alguns minutos.`
            : `Status atualizado para ${statusLabel(updatedOrder.status)} com sucesso.`,
        },
      }));
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      toast.success(
        `Pedido ${shortProtocol(updatedOrder.publicId)} atualizado para ${statusLabel(updatedOrder.status)}.`,
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel atualizar o status agora.";
      toast.error(message);
    },
  });

  const undoStatusMutation = useMutation({
    mutationFn: (orderId: number) => undoAdminOrderStatus(token as string, orderId),
    onSuccess: (updatedOrder) => {
      setOrderFeedbacks((current) => ({
        ...current,
        [updatedOrder.id]: {
          tone: "success",
          message: `Mudanca desfeita. O pedido voltou para ${statusLabel(updatedOrder.status)}.`,
        },
      }));
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      toast.success(
        `Ultima mudanca do pedido ${shortProtocol(updatedOrder.publicId)} foi desfeita com sucesso.`,
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel desfazer a ultima mudanca agora.";
      toast.error(message);
    },
  });

  const storeStatusMutation = useMutation({
    mutationFn: (input: { isOrderingPaused: boolean; pauseReason?: string | null }) =>
      updateAdminStoreStatus(token as string, input),
    onSuccess: (status) => {
      queryClient.setQueryData(STORE_STATUS_QUERY_KEY, status);
      void queryClient.invalidateQueries({ queryKey: STORE_STATUS_QUERY_KEY });
      toast.success(status.isOrderingPaused ? "Pedidos pausados no site." : "Pedidos reativados no site.");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel atualizar o status da loja.";
      toast.error(message);
    },
  });

  useEffect(() => {
    const authErrors = [
      meQuery.error,
      ordersQuery.error,
      dashboardQuery.error,
      newOrdersWatchQuery.error,
      storeStatusQuery.error,
    ].filter(
      (value): value is AdminApiError => value instanceof AdminApiError,
    );

    if (authErrors.some((error) => error.status === 401)) {
      clearAdminToken();
      setToken(null);
      setActiveView("orders");
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.removeQueries({ queryKey: DASHBOARD_QUERY_KEY });
      queryClient.removeQueries({ queryKey: NEW_ORDERS_WATCH_QUERY_KEY });
      queryClient.removeQueries({ queryKey: STORE_STATUS_QUERY_KEY });
      toast.error("Sua sessao de admin expirou. Entre novamente.");
    }
  }, [
    dashboardQuery.error,
    meQuery.error,
    newOrdersWatchQuery.error,
    ordersQuery.error,
    queryClient,
    storeStatusQuery.error,
  ]);

  useEffect(() => {
    const watchedOrders = newOrdersWatchQuery.data ?? [];
    const latestOrderId = Math.max(0, ...watchedOrders.map((order) => order.id));

    if (!latestOrderId) {
      return;
    }

    if (latestSeenOrderIdRef.current === null) {
      latestSeenOrderIdRef.current = latestOrderId;
      return;
    }

    if (latestOrderId <= latestSeenOrderIdRef.current) {
      return;
    }

    const newOrders = watchedOrders
      .filter((order) => order.id > (latestSeenOrderIdRef.current ?? 0))
      .sort((left, right) => left.id - right.id);
    const firstNewOrder = newOrders[0];

    latestSeenOrderIdRef.current = latestOrderId;

    if (firstNewOrder) {
      playNewOrderSound();
      toast.info(`Novo pedido de ${firstNewOrder.customerName}.`, {
        description: `Total ${formatCurrency(Number(firstNewOrder.total))} · ${shortProtocol(firstNewOrder.publicId)}`,
      });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    }
  }, [newOrdersWatchQuery.data, queryClient]);

  const visibleOrders = ordersQuery.data ?? [];
  const isLoadingSession = Boolean(token) && (meQuery.isLoading || ordersQuery.isLoading);
  const isRefreshingOrders =
    Boolean(token) &&
    ((ordersQuery.isFetching && !ordersQuery.isLoading) ||
      (dashboardQuery.isFetching && !dashboardQuery.isLoading));
  const hasActiveFilters =
    (ordersMode === "list" && statusFilter !== "all") ||
    fulfillmentFilter !== "all" ||
    deferredSearch.length > 0 ||
    datePreset !== "all";

  const stats = useMemo(() => {
    const dashboard = dashboardQuery.data ?? EMPTY_DASHBOARD;
    const activeOrders =
      dashboard.pendingOrders +
      dashboard.confirmedOrders +
      dashboard.preparingOrders +
      dashboard.outForDeliveryOrders;

    return {
      ...dashboard,
      activeOrders,
      grossRevenueNumber: Number(dashboard.grossRevenue),
      completedRevenueNumber: Number(dashboard.completedRevenue),
      activeRevenueNumber: Number(dashboard.activeRevenue),
      cancelledRevenueNumber: Number(dashboard.cancelledRevenue),
      averageTicketNumber: Number(dashboard.averageTicket),
    };
  }, [dashboardQuery.data]);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleLogout = async () => {
    const currentToken = token;

    clearAdminToken();
    setToken(null);
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ORDERS_QUERY_KEY });
    queryClient.removeQueries({ queryKey: DASHBOARD_QUERY_KEY });
    queryClient.removeQueries({ queryKey: NEW_ORDERS_WATCH_QUERY_KEY });
    latestSeenOrderIdRef.current = null;

    if (currentToken) {
      try {
        await logoutAdmin(currentToken);
      } catch {
        // Logout local basta por agora.
      }
    }

    toast.success("Sessao encerrada no painel.");
  };

  const handleStatusAction = (orderId: number, status: AdminOrderStatus) => {
    statusMutation.mutate({ orderId, status });
  };

  const handleDismissOrderFeedback = (orderId: number) => {
    setOrderFeedbacks((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  };

  const handleRefreshOrders = () => {
    void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  };

  return (
    <main className="min-h-screen bg-[#120d0b] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary/80">Pizzaria Mesa 10</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Painel de operacao
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Aqui a loja deixa de apenas receber pedidos e passa a controlar a fila de atendimento.
            </p>
          </div>

          <Link
            to="/"
            className="hidden rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/60 sm:inline-flex"
          >
            Voltar ao site
          </Link>
        </div>

        {!token ? (
          <section className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet sm:p-8">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                Acesso de administracao
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                O login do painel existe para separar cliente de operador. O site segue publico, mas
                a area de pedidos e protegida porque lida com operacao, dados do cliente e leitura da
                fila real.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Email admin
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@mesa10.com"
                    className={adminFieldClass()}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Senha
                  </label>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="Sua senha do painel"
                    className={adminFieldClass()}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="flex h-14 w-full items-center justify-center rounded-full bg-primary-gradient px-5 text-sm font-semibold text-primary-foreground shadow-elegant transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar no painel"}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <InfoCard
                title="O que esta sendo feito aqui"
                body="O operador acompanha pedidos por periodo, status, forma de atendimento e busca textual. Isso deixa a rotina mais objetiva quando a fila cresce."
              />
              <InfoCard
                title="Por que isso vem agora"
                body="Depois de salvar pedidos e mudar status, o proximo gargalo da operacao e entender o movimento do dia sem precisar contar tudo manualmente."
              />
              <InfoCard
                title="O que ainda nao entrou"
                body="Taxa por bairro, historico completo de auditoria e automacoes de cozinha ainda ficam para uma etapa mais madura do produto."
              />
            </div>
          </section>
        ) : (
          <section className="flex-1 space-y-6">
            <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
                  Sessao autenticada
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  {meQuery.data?.name ?? "Administrador"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {meQuery.data?.email ?? "Carregando usuario..."}
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold transition-colors hover:border-primary/60"
                >
                  Site publico
                </Link>
                <button
                  onClick={() => void handleLogout()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-5 text-sm font-semibold transition-colors hover:border-primary/60"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-4 shadow-sheet">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveView("orders")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    activeView === "orders"
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => setActiveView("catalog")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    activeView === "catalog"
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  Cardapio
                </button>
              </div>
            </div>

            {activeView === "orders" ? (
              <>
                <StoreOperationsCard
                  status={storeStatusQuery.data ?? null}
                  isLoading={storeStatusQuery.isLoading}
                  isUpdating={storeStatusMutation.isPending}
                  onPause={(pauseReason) =>
                    storeStatusMutation.mutate({ isOrderingPaused: true, pauseReason })
                  }
                  onResume={() =>
                    storeStatusMutation.mutate({ isOrderingPaused: false, pauseReason: null })
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <MetricCard
                    icon={<ShoppingBag className="h-5 w-5 text-primary" />}
                    label="Pedidos no periodo"
                    value={String(stats.totalOrders)}
                  />
                  <MetricCard
                    icon={<Clock3 className="h-5 w-5 text-primary" />}
                    label="Fila ativa"
                    value={String(stats.activeOrders)}
                  />
                  <MetricCard
                    icon={<Truck className="h-5 w-5 text-primary" />}
                    label="Entregas"
                    value={String(stats.deliveryOrders)}
                  />
                  <MetricCard
                    icon={<Store className="h-5 w-5 text-primary" />}
                    label="Receita valida"
                    value={formatCurrency(stats.grossRevenueNumber)}
                  />
                  <MetricCard
                    icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
                    label="Receita concluida"
                    value={formatCurrency(stats.completedRevenueNumber)}
                  />
                  <MetricCard
                    icon={<CreditCard className="h-5 w-5 text-primary" />}
                    label="Ticket medio"
                    value={formatCurrency(stats.averageTicketNumber)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <StatusMetric label="Pendentes" value={stats.pendingOrders} tone="amber" />
                  <StatusMetric label="Confirmados" value={stats.confirmedOrders} tone="sky" />
                  <StatusMetric label="Preparando" value={stats.preparingOrders} tone="orange" />
                  <StatusMetric label="Na entrega" value={stats.outForDeliveryOrders} tone="violet" />
                  <StatusMetric label="Concluidos" value={stats.completedOrders} tone="emerald" />
                  <StatusMetric label="Cancelados" value={stats.cancelledOrders} tone="red" />
                </div>

                <DashboardCharts stats={stats} />

                <div className="grid gap-4 lg:grid-cols-3">
                  <RankCard title="Mais vendidos" items={stats.topProducts} empty="Sem vendas no periodo." />
                  <RankCard title="Bairros com mais pedidos" items={stats.topNeighborhoods} empty="Sem entregas no periodo." />
                  <RankCard title="Horarios de pico" items={stats.busyHours} empty="Sem movimento no periodo." />
                </div>

                <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
                          {periodLabel}
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-semibold">
                          Fila da operacao
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Acompanhe pedidos por periodo, status, atendimento e busca.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:items-end">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          <BellRing className={`h-4 w-4 ${newOrdersWatchQuery.isFetching ? "text-primary" : ""}`} />
                          Aviso de novos pedidos ativo
                        </div>

                        <div className="flex rounded-full border border-border bg-background/80 p-1">
                          <button
                            onClick={() => setOrdersMode("list")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                              ordersMode === "list"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Lista
                          </button>
                          <button
                            onClick={() => setOrdersMode("kitchen")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                              ordersMode === "kitchen"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Cozinha
                          </button>
                        </div>

                        <button
                          onClick={handleRefreshOrders}
                          disabled={ordersQuery.isFetching || dashboardQuery.isFetching}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-5 text-sm font-semibold transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshingOrders ? "animate-spin" : ""}`} />
                          Atualizar fila
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-border/60 bg-background/50 p-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {DATE_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setDatePreset(option.value)}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                datePreset === option.value
                                  ? "border-primary bg-primary/12 text-primary"
                                  : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              }`}
                            >
                              <CalendarDays className="h-4 w-4" />
                              {option.label}
                            </button>
                          ))}
                        </div>

                        {datePreset === "custom" ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5">
                              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Inicio
                              </span>
                              <input
                                type="date"
                                value={customDateFrom}
                                onChange={(event) => setCustomDateFrom(event.target.value)}
                                className={adminFieldClass()}
                              />
                            </label>
                            <label className="space-y-1.5">
                              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Fim
                              </span>
                              <input
                                type="date"
                                value={customDateTo}
                                onChange={(event) => setCustomDateTo(event.target.value)}
                                className={adminFieldClass()}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>

                      {ordersMode === "list" ? (
                        <div className="flex flex-wrap gap-2">
                          {STATUS_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setStatusFilter(option.value)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                statusFilter === option.value
                                  ? "border-primary bg-primary/12 text-primary"
                                  : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Buscar por cliente, telefone ou protocolo"
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                          />
                        </label>

                        <select
                          value={fulfillmentFilter}
                          onChange={(event) =>
                            setFulfillmentFilter(event.target.value as AdminOrder["fulfillmentType"] | "all")
                          }
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                        >
                          {FULFILLMENT_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isLoadingSession ? (
                      <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
                        Carregando pedidos do painel...
                      </div>
                    ) : visibleOrders.length > 0 ? (
                      ordersMode === "kitchen" ? (
                        <KitchenBoard
                          orders={visibleOrders}
                          onStatusAction={handleStatusAction}
                          onUndoStatus={(orderId) => undoStatusMutation.mutate(orderId)}
                          updatingOrderId={statusMutation.variables?.orderId}
                          isUpdating={statusMutation.isPending}
                          undoingOrderId={undoStatusMutation.variables}
                          isUndoing={undoStatusMutation.isPending}
                        />
                      ) : (
                        <div className="space-y-4">
                        {visibleOrders.map((order) => {
                          const primaryStatusAction = getPrimaryStatusAction(order);
                          const canCancelOrder = canCancelStatus(order.status);
                          const isUpdatingThisOrder =
                            statusMutation.isPending && statusMutation.variables?.orderId === order.id;
                          const isUndoingThisOrder =
                            undoStatusMutation.isPending && undoStatusMutation.variables === order.id;
                          const canUndoRecentStatus = order.canUndoStatusChange && Boolean(order.previousStatus);
                          const orderFeedback = orderFeedbacks[order.id];
                          const isOperationallyLocked = !primaryStatusAction && !canCancelOrder;

                          return (
                            <article
                              key={order.id}
                              className="rounded-3xl border border-border/60 bg-background/60 p-5"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge status={order.status} />
                                    <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      {fulfillmentLabel(order.fulfillmentType)}
                                    </span>
                                    <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      {shortProtocol(order.publicId)}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="font-display text-2xl font-semibold">{order.customerName}</h4>
                                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      {order.customerPhone}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-left lg:text-right">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                    Total
                                  </p>
                                  <p className="mt-1 font-display text-3xl font-semibold">
                                    {formatCurrency(Number(order.total))}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDateTime(order.createdAt)}
                                  </p>
                                  <OrderDetailSheet order={order} />
                                </div>
                              </div>

                              <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                                <div className="rounded-2xl border border-border/60 bg-surface p-4">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                    Itens do pedido
                                  </p>
                                  <ul className="mt-3 space-y-3">
                                    {order.items.slice(0, 3).map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex flex-col gap-2 border-b border-border/50 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                                      >
                                        <div>
                                          <p className="font-medium text-foreground">
                                            {item.quantity}x {item.productName}
                                          </p>
                                          <p className="mt-1 text-sm text-muted-foreground">
                                            {buildItemDetail(item)}
                                          </p>
                                          {item.note && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Observacao: {item.note}
                                            </p>
                                          )}
                                        </div>

                                        <p className="text-sm font-semibold text-foreground">
                                          {formatCurrency(Number(item.lineTotal))}
                                        </p>
                                      </li>
                                    ))}
                                    {order.items.length > 3 ? (
                                      <li className="text-sm text-muted-foreground">
                                        + {order.items.length - 3} item(ns) no detalhe do pedido.
                                      </li>
                                    ) : null}
                                  </ul>
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-surface p-4">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                    Atendimento
                                  </p>
                                  <dl className="mt-3 space-y-3 text-sm">
                                    <div>
                                      <dt className="text-muted-foreground">Status operacional</dt>
                                      <dd className="mt-2">
                                        <div className="space-y-3">
                                          {orderFeedback ? (
                                            <div
                                              className={`rounded-2xl border p-3 ${
                                                orderFeedback.tone === "success"
                                                  ? "border-emerald-500/25 bg-emerald-500/10"
                                                  : "border-sky-500/25 bg-sky-500/10"
                                              }`}
                                            >
                                              <div className="flex items-start gap-3">
                                                <CheckCircle2
                                                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                                                    orderFeedback.tone === "success"
                                                      ? "text-emerald-200"
                                                      : "text-sky-200"
                                                  }`}
                                                />
                                                <p className="flex-1 text-xs text-foreground/90">
                                                  {orderFeedback.message}
                                                </p>
                                                <button
                                                  onClick={() => handleDismissOrderFeedback(order.id)}
                                                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                                                  aria-label="Fechar aviso"
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ) : null}

                                          <OrderProgress order={order} />

                                          {primaryStatusAction ? (
                                            <button
                                              onClick={() =>
                                                handleStatusAction(order.id, primaryStatusAction.nextStatus)
                                              }
                                              disabled={isUpdatingThisOrder || isUndoingThisOrder}
                                              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              <primaryStatusAction.Icon className="h-4 w-4" />
                                              {isUpdatingThisOrder
                                                ? "Atualizando..."
                                                : primaryStatusAction.label}
                                            </button>
                                          ) : null}

                                          {canCancelOrder ? (
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <button
                                                  disabled={isUpdatingThisOrder || isUndoingThisOrder}
                                                  className="flex h-10 w-full items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition-colors hover:border-destructive/45 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  Cancelar pedido
                                                </button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent className="border-border bg-surface-elevated">
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Cancelar este pedido?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Essa acao tira o pedido da fila operacional. Voce ainda podera
                                                    desfazer por alguns minutos, mas o ideal e cancelar apenas depois
                                                    de confirmar com o cliente ou com a loja.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel className="border-border bg-background/80">
                                                    Voltar
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => handleStatusAction(order.id, "cancelled")}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    Confirmar cancelamento
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          ) : null}

                                          {canUndoRecentStatus && order.previousStatus ? (
                                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.16em] text-amber-100/80">
                                                Desfazer disponivel
                                              </p>
                                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-foreground">
                                                  {statusLabel(order.previousStatus)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">-&gt;</span>
                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-50">
                                                  {statusLabel(order.status)}
                                                </span>
                                              </div>
                                              <p className="mt-2 text-xs text-muted-foreground">
                                                Use isso apenas para corrigir um toque acidental ou uma confirmacao indevida.
                                              </p>
                                              <button
                                                onClick={() => undoStatusMutation.mutate(order.id)}
                                                disabled={isUpdatingThisOrder || isUndoingThisOrder}
                                                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-amber-500/25 bg-background/80 px-4 text-sm font-semibold text-amber-50 transition-colors hover:border-amber-400/45 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                <RotateCcw className="h-4 w-4" />
                                                {isUndoingThisOrder ? "Desfazendo..." : "Desfazer ultima mudanca"}
                                              </button>
                                            </div>
                                          ) : null}

                                          {isOperationallyLocked && (
                                            <p className="text-xs text-muted-foreground">
                                              Este pedido ja chegou a um estado final e nao aceita nova mudanca direta por aqui.
                                            </p>
                                          )}
                                        </div>
                                      </dd>
                                    </div>

                                    <div>
                                      <dt className="text-muted-foreground">Pagamento</dt>
                                      <dd className="mt-1 font-medium text-foreground">
                                        {paymentMethodLabel(order.paymentMethod)}
                                      </dd>
                                    </div>

                                    <div>
                                      <dt className="text-muted-foreground">Endereco</dt>
                                      <dd className="mt-1 font-medium text-foreground">
                                        {formatAddress(order)}
                                      </dd>
                                    </div>

                                    {order.notes && (
                                      <div>
                                        <dt className="text-muted-foreground">Observacoes gerais</dt>
                                        <dd className="mt-1 font-medium text-foreground">{order.notes}</dd>
                                      </div>
                                    )}
                                  </dl>

                                  <OrderTimeline events={order.events} />
                                </div>
                              </div>
                            </article>
                          );
                        })}
                        </div>
                      )
                    ) : (
                      <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "Nenhum pedido encontrado com os filtros atuais."
                          : "Nenhum pedido encontrado ainda. Assim que o site registrar novos pedidos, eles aparecerao aqui."}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <AdminCatalogPanel token={token as string} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        {icon}
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </article>
  );
}

function StoreOperationsCard({
  status,
  isLoading,
  isUpdating,
  onPause,
  onResume,
}: {
  status: StoreStatus | null;
  isLoading: boolean;
  isUpdating: boolean;
  onPause: (pauseReason: string) => void;
  onResume: () => void;
}) {
  const [pauseReason, setPauseReason] = useState(
    "Atendimento pausado temporariamente. Estamos ajustando a operacao.",
  );
  const isPaused = Boolean(status?.isOrderingPaused);

  return (
    <section className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              isPaused
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {isPaused ? <PauseCircle className="h-5 w-5" /> : <Power className="h-5 w-5" />}
          </span>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
              Controle operacional
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">
              {isLoading
                ? "Carregando status da loja"
                : isPaused
                  ? "Pedidos pausados no site"
                  : "Pedidos abertos no site"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {isPaused
                ? status?.pauseReason || "O cliente ainda ve o cardapio, mas nao consegue registrar novo pedido."
                : "Use este controle quando a cozinha estiver sobrecarregada, sem motoboy ou fora do atendimento."}
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          <input
            value={pauseReason}
            onChange={(event) => setPauseReason(event.target.value)}
            disabled={isPaused || isUpdating}
            placeholder="Mensagem mostrada ao cliente quando pausar"
            className="h-11 w-full rounded-full border border-border bg-background/80 px-4 text-sm outline-none transition-colors focus:border-primary/70 disabled:opacity-60"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPause(pauseReason)}
              disabled={isPaused || isUpdating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PauseCircle className="h-4 w-4" />
              Pausar pedidos
            </button>
            <button
              type="button"
              onClick={onResume}
              disabled={!isPaused || isUpdating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" />
              Reabrir pedidos
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardCharts({ stats }: { stats: DashboardStats }) {
  const STATUS_SEGMENTS = [
    { name: "Pendentes", value: stats.pendingOrders, color: "#f59e0b" },
    { name: "Confirmados", value: stats.confirmedOrders, color: "#38bdf8" },
    { name: "Preparando", value: stats.preparingOrders, color: "#fb923c" },
    { name: "Na entrega", value: stats.outForDeliveryOrders, color: "#a78bfa" },
    { name: "Concluidos", value: stats.completedOrders, color: "#34d399" },
    { name: "Cancelados", value: stats.cancelledOrders, color: "#f87171" },
  ];

  const totalOrders = STATUS_SEGMENTS.reduce((sum, s) => sum + s.value, 0);
  const activeSegments = STATUS_SEGMENTS.filter((s) => s.value > 0);

  const REVENUE_COLORS: Record<string, string> = {
    Concluida: "#34d399",
    Ativa: "#f59e0b",
    Cancelada: "#f87171",
  };

  const revenueData = [
    { name: "Concluida", value: stats.completedRevenueNumber },
    { name: "Ativa", value: stats.activeRevenueNumber },
    { name: "Cancelada", value: stats.cancelledRevenueNumber },
  ].filter((item) => item.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Order Distribution ── */}
      <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
        <h3 className="font-display text-xl font-semibold">Distribuicao da fila</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Proporção visual de cada etapa no fluxo de pedidos.
        </p>

        {totalOrders > 0 ? (
          <>
            {/* Stacked bar */}
            <div className="mt-6 flex h-8 overflow-hidden rounded-full border border-border/40">
              {activeSegments.map((seg) => (
                <div
                  key={seg.name}
                  title={`${seg.name}: ${seg.value}`}
                  className="relative flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                  style={{
                    width: `${(seg.value / totalOrders) * 100}%`,
                    backgroundColor: seg.color,
                    minWidth: seg.value > 0 ? "24px" : 0,
                  }}
                >
                  {(seg.value / totalOrders) >= 0.08 && seg.value}
                </div>
              ))}
            </div>

            {/* Detail rows */}
            <ul className="mt-5 space-y-2.5">
              {STATUS_SEGMENTS.map((seg) => {
                const pct = totalOrders > 0 ? ((seg.value / totalOrders) * 100).toFixed(0) : "0";
                return (
                  <li key={seg.name} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{seg.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">{seg.value}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground/70">{pct}%</span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-right text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{totalOrders}</span> pedidos
            </p>
          </>
        ) : (
          <EmptyChartState message="Sem pedidos no periodo selecionado." />
        )}
      </article>

      {/* ── Revenue by Status ── */}
      <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
        <h3 className="font-display text-xl font-semibold">Receita por situacao</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Separa dinheiro em fila, concluido e cancelado para leitura rapida.
        </p>
        <div className="mt-5 h-64">
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barCategoryGap="28%">
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value}`}
                  width={68}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                  {revenueData.map((entry) => (
                    <Cell key={entry.name} fill={REVENUE_COLORS[entry.name] ?? "#e24a2a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="Sem receita para analisar neste periodo." />
          )}
        </div>

        {revenueData.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {revenueData.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: REVENUE_COLORS[item.name] ?? "#e24a2a" }}
                />
                {item.name}: <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-border/60 bg-background/50 px-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

const chartTooltipStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  background: "rgba(18, 13, 11, 0.96)",
  color: "#fff",
};

function StatusMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "orange" | "violet" | "emerald" | "red";
}) {
  const toneClass = {
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-100",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-100",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    red: "border-destructive/30 bg-destructive/10 text-destructive",
  }[tone];

  return (
    <article className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </article>
  );
}

function RankCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: AdminOrdersDashboard["topProducts"];
  empty: string;
}) {
  return (
    <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-5 shadow-sheet">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">#{index + 1}</p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {item.value}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </article>
  );
}

function kitchenToneClass(tone: "amber" | "sky" | "orange" | "violet") {
  return {
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-100",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-100",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-100",
  }[tone];
}

function KitchenBoard({
  orders,
  onStatusAction,
  onUndoStatus,
  updatingOrderId,
  isUpdating,
  undoingOrderId,
  isUndoing,
}: {
  orders: AdminOrder[];
  onStatusAction: (orderId: number, status: AdminOrderStatus) => void;
  onUndoStatus: (orderId: number) => void;
  updatingOrderId?: number;
  isUpdating: boolean;
  undoingOrderId?: number;
  isUndoing: boolean;
}) {
  const activeOrders = orders.filter((order) =>
    KITCHEN_COLUMNS.some((column) => column.status === order.status),
  );

  if (activeOrders.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
        Nenhum pedido ativo para cozinha neste periodo.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {KITCHEN_COLUMNS.map((column) => {
        const columnOrders = activeOrders.filter((order) => order.status === column.status);

        return (
          <section
            key={column.status}
            className="min-h-[220px] rounded-3xl border border-border/60 bg-background/55 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {column.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {columnOrders.length} pedido(s)
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${kitchenToneClass(column.tone)}`}>
                {columnOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnOrders.length > 0 ? (
                columnOrders.map((order) => {
                  const primaryStatusAction = getPrimaryStatusAction(order);
                  const isUpdatingThisOrder = isUpdating && updatingOrderId === order.id;
                  const isUndoingThisOrder = isUndoing && undoingOrderId === order.id;

                  return (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-border/60 bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={order.status} />
                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {shortProtocol(order.publicId)}
                            </span>
                          </div>
                          <h4 className="mt-3 truncate font-display text-xl font-semibold">
                            {order.customerName}
                          </h4>
                          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {order.customerPhone}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Total
                          </p>
                          <p className="mt-1 font-display text-xl font-semibold">
                            {formatCurrency(Number(order.total))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-border/50 bg-background/50 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Itens
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                          {order.items.slice(0, 2).map((item) => (
                            <li key={item.id}>
                              {item.quantity}x {item.productName}
                            </li>
                          ))}
                          {order.items.length > 2 ? (
                            <li className="text-muted-foreground">
                              + {order.items.length - 2} item(ns)
                            </li>
                          ) : null}
                        </ul>
                      </div>

                      <div className="mt-4 space-y-2">
                        {primaryStatusAction ? (
                          <button
                            onClick={() => onStatusAction(order.id, primaryStatusAction.nextStatus)}
                            disabled={isUpdatingThisOrder || isUndoingThisOrder}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <primaryStatusAction.Icon className="h-4 w-4" />
                            {isUpdatingThisOrder ? "Atualizando..." : primaryStatusAction.label}
                          </button>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2">
                          <OrderDetailSheet order={order} compact />
                          <button
                            onClick={() => printOrderTicket(order)}
                            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-3 text-xs font-semibold transition-colors hover:border-primary/60"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Comanda
                          </button>
                        </div>

                        <div>
                          {canCancelStatus(order.status) ? (
                            <KitchenCancelButton
                              order={order}
                              disabled={isUpdatingThisOrder || isUndoingThisOrder}
                              onCancel={() => onStatusAction(order.id, "cancelled")}
                            />
                          ) : null}
                        </div>

                        {order.canUndoStatusChange && order.previousStatus ? (
                          <button
                            onClick={() => onUndoStatus(order.id)}
                            disabled={isUpdatingThisOrder || isUndoingThisOrder}
                            className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-50 transition-colors hover:border-amber-400/45 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {isUndoingThisOrder ? "Desfazendo..." : "Desfazer"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  Sem pedidos aqui.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KitchenCancelButton({
  order,
  disabled,
  onCancel,
}: {
  order: AdminOrder;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={disabled}
          className="flex h-10 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:border-destructive/45 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-surface-elevated">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar pedido {shortProtocol(order.publicId)}?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa acao tira o pedido da fila operacional. Use apenas depois de confirmar com o cliente ou com a loja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-background/80">Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onCancel}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OrderDetailSheet({ order, compact = false }: { order: AdminOrder; compact?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={
            compact
              ? "flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-3 text-xs font-semibold transition-colors hover:border-primary/60"
              : "mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-4 text-sm font-semibold transition-colors hover:border-primary/60"
          }
        >
          <Eye className="h-4 w-4" />
          {compact ? "Detalhes" : "Ver detalhes"}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto border-border bg-[#120d0b] p-0 sm:max-w-2xl">
        <div className="space-y-5 p-5 sm:p-6">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {shortProtocol(order.publicId)}
              </span>
            </div>
            <SheetTitle className="font-display text-3xl">{order.customerName}</SheetTitle>
            <SheetDescription>
              Pedido registrado em {formatDateTime(order.createdAt)}.
            </SheetDescription>
          </SheetHeader>

          <button
            onClick={() => printOrderTicket(order)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-4 text-sm font-semibold transition-colors hover:border-primary/60"
          >
            <Printer className="h-4 w-4" />
            Imprimir comanda
          </button>

          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cliente</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Nome" value={order.customerName} />
              <DetailRow label="Telefone" value={order.customerPhone} icon={<Phone className="h-4 w-4" />} />
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Atendimento</p>
            <div className="mt-3 grid gap-3">
              <OrderProgress order={order} />
              <DetailRow
                label="Tipo"
                value={fulfillmentLabel(order.fulfillmentType)}
                icon={<Store className="h-4 w-4" />}
              />
              <DetailRow
                label="Endereco"
                value={formatFullAddress(order)}
                icon={<MapPin className="h-4 w-4" />}
              />
              {order.reference ? <DetailRow label="Referencia" value={order.reference} /> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Itens</p>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border/50 bg-background/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.quantity}x {item.productName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{buildItemDetail(item)}</p>
                      {item.note ? (
                        <p className="mt-2 text-xs text-muted-foreground">Observacao: {item.note}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(Number(item.lineTotal))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Pagamento</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="Forma"
                value={paymentMethodLabel(order.paymentMethod)}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <DetailRow label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
              <DetailRow label="Entrega" value={formatCurrency(Number(order.deliveryFee))} />
              <DetailRow label="Total" value={formatCurrency(Number(order.total))} />
              {order.changeFor ? (
                <DetailRow label="Troco para" value={formatCurrency(Number(order.changeFor))} />
              ) : null}
            </div>
          </section>

          {order.notes ? (
            <section className="rounded-2xl border border-border/60 bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Observacoes gerais
              </p>
              <p className="mt-3 text-sm text-foreground">{order.notes}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <OrderTimeline events={order.events} showAll />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-start gap-2 text-sm font-medium text-foreground">
        {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
        <span className="whitespace-pre-line">{value}</span>
      </div>
    </div>
  );
}

function OrderProgress({ order }: { order: AdminOrder }) {
  const steps = getOrderFlowSteps(order);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Fluxo do pedido
      </p>
      <div className="mt-3 grid gap-2">
        {steps.map((step) => {
          const state = getOrderStepState(order.status, step, steps);

          return (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  state === "done"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : state === "current"
                      ? step === "cancelled"
                        ? "border-destructive/35 bg-destructive/10 text-destructive"
                        : "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : getOrderStepNumber(steps, step)}
              </span>
              <span
                className={`text-sm ${
                  state === "current" ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {statusLabel(step)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderTimeline({
  events,
  showAll = false,
}: {
  events: AdminOrder["events"];
  showAll?: boolean;
}) {
  const visibleEvents = (showAll ? events : events.slice(-4)).reverse();

  return (
    <div className={showAll ? "" : "mt-4 rounded-2xl border border-border/60 bg-background/50 p-3"}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Historico</p>
      {visibleEvents.length > 0 ? (
        <ol className="mt-3 space-y-3">
          {visibleEvents.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{orderEventLabel(event)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.adminUserName ?? "Sistema"} · {formatDateTime(event.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          As proximas mudancas feitas pelo painel aparecerao aqui.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminOrderStatus }) {
  const tone =
    status === "pending"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : status === "confirmed"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
        : status === "preparing"
          ? "border-orange-500/30 bg-orange-500/10 text-orange-100"
          : status === "out_for_delivery"
            ? "border-violet-500/30 bg-violet-500/10 text-violet-100"
            : status === "completed"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : status === "cancelled"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-background text-foreground";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: AdminOrderStatus) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "confirmed":
      return "Confirmado";
    case "preparing":
      return "Preparando";
    case "out_for_delivery":
      return "Saiu para entrega";
    case "completed":
      return "Concluido";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function orderEventLabel(event: AdminOrder["events"][number]) {
  if (event.eventType === "status_undone") {
    return event.nextStatus
      ? `Desfez a mudanca e voltou para ${statusLabel(event.nextStatus)}`
      : "Desfez a ultima mudanca";
  }

  if (event.previousStatus && event.nextStatus) {
    return `${statusLabel(event.previousStatus)} -> ${statusLabel(event.nextStatus)}`;
  }

  if (event.nextStatus) {
    return `Status definido como ${statusLabel(event.nextStatus)}`;
  }

  return "Atualizacao registrada";
}

function fulfillmentLabel(value: AdminOrder["fulfillmentType"]) {
  return value === "delivery" ? "Entrega" : "Retirada";
}

function paymentMethodLabel(method: AdminOrder["paymentMethod"]) {
  switch (method) {
    case "pix":
      return "Pix";
    case "money":
      return "Dinheiro";
    case "card":
      return "Cartao";
    default:
      return method;
  }
}

function shortProtocol(publicId: string) {
  return publicId.slice(0, 8).toUpperCase();
}

function getPrimaryStatusAction(order: AdminOrder):
  | {
      label: string;
      nextStatus: AdminOrderStatus;
      Icon: LucideIcon;
    }
  | null {
  switch (order.status) {
    case "pending":
      return {
        label: "Confirmar pedido",
        nextStatus: "confirmed",
        Icon: CheckCircle2,
      };
    case "confirmed":
      return {
        label: "Iniciar preparo",
        nextStatus: "preparing",
        Icon: Clock3,
      };
    case "preparing":
      return order.fulfillmentType === "delivery"
        ? {
            label: "Saiu para entrega",
            nextStatus: "out_for_delivery",
            Icon: Truck,
          }
        : {
            label: "Concluir retirada",
            nextStatus: "completed",
            Icon: Store,
          };
    case "out_for_delivery":
      return {
        label: "Concluir entrega",
        nextStatus: "completed",
        Icon: CheckCircle2,
      };
    case "completed":
    case "cancelled":
    default:
      return null;
  }
}

function canCancelStatus(status: AdminOrderStatus) {
  return status !== "completed" && status !== "cancelled";
}

function getOrderFlowSteps(order: AdminOrder): AdminOrderStatus[] {
  const baseSteps: AdminOrderStatus[] =
    order.fulfillmentType === "delivery"
      ? ["pending", "confirmed", "preparing", "out_for_delivery", "completed"]
      : ["pending", "confirmed", "preparing", "completed"];

  return order.status === "cancelled" ? [...baseSteps, "cancelled"] : baseSteps;
}

function getOrderStepState(
  currentStatus: AdminOrderStatus,
  step: AdminOrderStatus,
  steps: AdminOrderStatus[],
) {
  if (currentStatus === "cancelled") {
    return step === "cancelled" ? "current" : "upcoming";
  }

  const currentIndex = steps.indexOf(currentStatus);
  const stepIndex = steps.indexOf(step);

  if (currentIndex === -1 || stepIndex === -1) {
    return "upcoming";
  }

  if (stepIndex < currentIndex) {
    return "done";
  }

  return stepIndex === currentIndex ? "current" : "upcoming";
}

function getOrderStepNumber(steps: AdminOrderStatus[], step: AdminOrderStatus) {
  return String(steps.indexOf(step) + 1);
}

function buildItemDetail(item: AdminOrder["items"][number]) {
  const parts = [item.pizzaSize ?? item.productOptionLabel].filter(Boolean) as string[];

  if (item.crustName) {
    parts.push(`Borda ${item.crustName}`);
  }

  return parts.join(" | ");
}

function formatAddress(order: AdminOrder) {
  if (order.fulfillmentType === "pickup") {
    return "Cliente vai retirar na loja.";
  }

  const address = [order.street, order.number].filter(Boolean).join(", ");
  const neighborhood = order.neighborhood ? ` - ${order.neighborhood}` : "";
  return `${address || "Endereco nao informado"}${neighborhood}`;
}

function formatFullAddress(order: AdminOrder) {
  if (order.fulfillmentType === "pickup") {
    return "Cliente vai retirar na loja.";
  }

  const mainAddress = [order.street, order.number].filter(Boolean).join(", ");
  const cityLine = [order.neighborhood, order.city, order.state].filter(Boolean).join(" - ");
  const complement = order.complement ? `Complemento: ${order.complement}` : null;
  const postalCode = order.postalCode ? `CEP: ${order.postalCode}` : null;

  return [mainAddress || "Endereco nao informado", cityLine, complement, postalCode]
    .filter(Boolean)
    .join("\n");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function playNewOrderSound() {
  try {
    const browserWindow = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass = window.AudioContext || browserWindow.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Browsers can block audio until the operator interacts with the page.
  }
}

function printOrderTicket(order: AdminOrder) {
  const printWindow = window.open("", "_blank", "width=420,height=720");

  if (!printWindow) {
    toast.error("Nao foi possivel abrir a janela de impressao.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildOrderTicketHtml(order));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildOrderTicketHtml(order: AdminOrder) {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(String(item.quantity))}x ${escapeHtml(item.productName)}</strong>
            <div class="muted">${escapeHtml(buildItemDetail(item) || "-")}</div>
            ${item.note ? `<div class="note">Obs: ${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td class="money">${escapeHtml(formatCurrency(Number(item.lineTotal)))}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Comanda ${escapeHtml(shortProtocol(order.publicId))}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 18px;
            color: #111;
            font-family: Arial, sans-serif;
            font-size: 13px;
          }
          h1, h2, p { margin: 0; }
          h1 { font-size: 18px; text-transform: uppercase; }
          h2 { margin-top: 14px; margin-bottom: 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; }
          td { border-top: 1px solid #ddd; padding: 8px 0; vertical-align: top; }
          .header { border-bottom: 2px solid #111; padding-bottom: 12px; }
          .protocol { margin-top: 4px; font-size: 12px; }
          .muted { color: #555; font-size: 12px; margin-top: 2px; }
          .note { color: #111; font-size: 12px; margin-top: 4px; font-weight: 700; }
          .money { text-align: right; white-space: nowrap; font-weight: 700; }
          .box { border: 1px solid #111; padding: 10px; margin-top: 12px; }
          .line { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
          .total { border-top: 2px solid #111; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: 700; }
          .pre { white-space: pre-line; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pizzaria Mesa 10</h1>
          <p class="protocol">Pedido ${escapeHtml(shortProtocol(order.publicId))} · ${escapeHtml(formatDateTime(order.createdAt))}</p>
          <p class="protocol">${escapeHtml(statusLabel(order.status))} · ${escapeHtml(fulfillmentLabel(order.fulfillmentType))}</p>
        </div>

        <div class="box">
          <h2>Cliente</h2>
          <p><strong>${escapeHtml(order.customerName)}</strong></p>
          <p>${escapeHtml(order.customerPhone)}</p>
        </div>

        <h2>Itens</h2>
        <table>${itemRows}</table>

        <div class="box">
          <h2>Atendimento</h2>
          <p class="pre">${escapeHtml(formatFullAddress(order))}</p>
          ${order.reference ? `<p><strong>Referencia:</strong> ${escapeHtml(order.reference)}</p>` : ""}
        </div>

        <div class="box">
          <h2>Pagamento</h2>
          <div class="line"><span>Forma</span><strong>${escapeHtml(paymentMethodLabel(order.paymentMethod))}</strong></div>
          <div class="line"><span>Subtotal</span><strong>${escapeHtml(formatCurrency(Number(order.subtotal)))}</strong></div>
          <div class="line"><span>Entrega</span><strong>${escapeHtml(formatCurrency(Number(order.deliveryFee)))}</strong></div>
          ${
            order.changeFor
              ? `<div class="line"><span>Troco para</span><strong>${escapeHtml(formatCurrency(Number(order.changeFor)))}</strong></div>`
              : ""
          }
          <div class="line total"><span>Total</span><strong>${escapeHtml(formatCurrency(Number(order.total)))}</strong></div>
        </div>

        ${
          order.notes
            ? `<div class="box"><h2>Observacoes</h2><p>${escapeHtml(order.notes)}</p></div>`
            : ""
        }
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildDateRange(
  preset: AdminDatePreset,
  customDateFrom: string,
  customDateTo: string,
): AdminOrdersDashboardFilters {
  const today = new Date();

  switch (preset) {
    case "today": {
      const value = toDateInput(today);
      return { dateFrom: value, dateTo: value };
    }
    case "yesterday": {
      const value = toDateInput(addDays(today, -1));
      return { dateFrom: value, dateTo: value };
    }
    case "last7":
      return {
        dateFrom: toDateInput(addDays(today, -6)),
        dateTo: toDateInput(today),
      };
    case "custom":
      return normalizeCustomDateRange(customDateFrom, customDateTo);
    case "all":
    default:
      return {};
  }
}

function normalizeCustomDateRange(dateFrom: string, dateTo: string): AdminOrdersDashboardFilters {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return { dateFrom: dateTo, dateTo: dateFrom };
  }

  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
}

function buildPeriodLabel(preset: AdminDatePreset, range: AdminOrdersDashboardFilters) {
  switch (preset) {
    case "today":
      return "Pedidos de hoje";
    case "yesterday":
      return "Pedidos de ontem";
    case "last7":
      return "Pedidos dos ultimos 7 dias";
    case "custom":
      if (range.dateFrom && range.dateTo) {
        return `Pedidos de ${formatDateLabel(range.dateFrom)} ate ${formatDateLabel(range.dateTo)}`;
      }

      if (range.dateFrom) {
        return `Pedidos desde ${formatDateLabel(range.dateFrom)}`;
      }

      if (range.dateTo) {
        return `Pedidos ate ${formatDateLabel(range.dateTo)}`;
      }

      return "Pedidos por periodo";
    case "all":
    default:
      return "Todos os pedidos";
  }
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function adminFieldClass() {
  return "w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary";
}
