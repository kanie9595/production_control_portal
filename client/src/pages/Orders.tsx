import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, Factory, Loader2, Plus, X, Package, Clock, CheckCircle2, AlertTriangle,
  Wrench, ChevronRight, History,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const MANAGER_ROLES = ["production_manager", "production_director"];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "Работает", color: "oklch(0.7 0.18 145)", bg: "oklch(0.7 0.18 145 / 0.12)" },
  idle: { label: "Простой", color: "oklch(0.75 0.15 85)", bg: "oklch(0.75 0.15 85 / 0.12)" },
  maintenance: { label: "Ремонт", color: "oklch(0.65 0.25 25)", bg: "oklch(0.65 0.25 25 / 0.12)" },
  changeover: { label: "Переналадка", color: "oklch(0.65 0.18 200)", bg: "oklch(0.65 0.18 200 / 0.12)" },
};

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "oklch(0.75 0.15 85)" },
  in_progress: { label: "В работе", color: "oklch(0.65 0.18 200)" },
  completed: { label: "Выполнен", color: "oklch(0.7 0.18 145)" },
  cancelled: { label: "Отменён", color: "oklch(0.5 0.05 260)" },
};

export default function Orders() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canManage = user?.role === "admin" || MANAGER_ROLES.includes((user as any)?.productionRole ?? "");

  // Create order form
  const [product, setProduct] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [moldName, setMoldName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const utils = trpc.useUtils();
  const machinesQuery = trpc.machines.list.useQuery(undefined, { enabled: isAuthenticated });
  const allOrdersQuery = trpc.orders.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15000 });
  const machineOrdersQuery = trpc.orders.forMachine.useQuery(
    { machineId: selectedMachine! },
    { enabled: !!selectedMachine }
  );

  // Fetch lookups for dropdown selectors
  const lookupsQuery = trpc.lookups.all.useQuery(undefined, { enabled: isAuthenticated });

  const lookupsByCategory = useMemo(() => {
    const map = new Map<string, Array<{ id: number; value: string }>>();
    for (const l of lookupsQuery.data ?? []) {
      if (!l.isActive) continue;
      const arr = map.get(l.category) ?? [];
      arr.push(l);
      map.set(l.category, arr);
    }
    return map;
  }, [lookupsQuery.data]);

  const getOptions = (cat: string) => lookupsByCategory.get(cat) ?? [];

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Заказ создан");
      setShowCreateOrder(false);
      setProduct(""); setColor(""); setQuantity(0); setMoldName(""); setOrderNotes("");
      utils.orders.list.invalidate();
      utils.orders.forMachine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateOrderStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Статус обновлён");
      utils.orders.list.invalidate();
      utils.orders.forMachine.invalidate();
      utils.machines.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Build machine -> active order map
  const machineOrderMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const order of allOrdersQuery.data ?? []) {
      if (order.status === "in_progress" || order.status === "pending") {
        const existing = map.get(order.machineId);
        if (!existing || order.status === "in_progress") {
          map.set(order.machineId, order);
        }
      }
    }
    return map;
  }, [allOrdersQuery.data]);

  const machines = machinesQuery.data ?? [];
  const selectedMachineData = machines.find((m) => m.id === selectedMachine);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="text-center"><p className="text-muted-foreground mb-4">Войдите в систему</p><Button onClick={() => setLocation("/")}>На главную</Button></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      <header className="border-b border-border sticky top-0 z-10" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { if (selectedMachine) { setSelectedMachine(null); setShowHistory(false); } else { setLocation("/"); } }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Factory className="w-5 h-5" style={{ color: "oklch(0.75 0.15 85)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">
              {selectedMachine ? `Станок ${selectedMachineData?.number ?? ""}` : "Заказы — Станки"}
            </h1>
          </div>
          {selectedMachine && canManage && (
            <Button size="sm" onClick={() => setShowCreateOrder(!showCreateOrder)} className="gap-2 font-mono text-xs">
              <Plus className="w-3.5 h-3.5" /> Новый заказ
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Machine grid */}
        {!selectedMachine && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-mono">Нажмите на станок для просмотра заказов</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-3">
              {machines.map((machine) => {
                const st = statusConfig[machine.status] ?? statusConfig.idle;
                const activeOrder = machineOrderMap.get(machine.id);
                const remaining = activeOrder ? activeOrder.quantity - (activeOrder.completedQty ?? 0) : 0;
                return (
                  <button key={machine.id} onClick={() => setSelectedMachine(machine.id)}
                    className="rounded-xl border border-border p-3 text-left hover:border-primary/50 transition-all group relative"
                    style={{ background: "oklch(0.18 0.012 260)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-foreground">{machine.number}</span>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground mb-1 truncate">{machine.name}</p>
                    <div className="rounded px-1.5 py-0.5 text-[8px] font-mono inline-block" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </div>
                    {activeOrder && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[8px] text-muted-foreground truncate">{activeOrder.product}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[8px] font-mono" style={{ color: "oklch(0.75 0.15 85)" }}>
                            {activeOrder.completedQty ?? 0}/{activeOrder.quantity} кор.
                          </p>
                        </div>
                        <p className="text-[7px] font-mono mt-0.5" style={{ color: remaining > 0 ? "oklch(0.65 0.18 200)" : "oklch(0.7 0.18 145)" }}>
                          Осталось: {Math.max(0, remaining)} кор.
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {machines.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Станки не найдены. Нажмите «Инициализировать данные» на главной странице.
              </div>
            )}
          </div>
        )}

        {/* Machine detail */}
        {selectedMachine && selectedMachineData && (
          <div className="space-y-4">
            {/* Machine info */}
            <div className="rounded-xl border border-border p-4 flex items-center gap-4" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: statusConfig[selectedMachineData.status]?.bg }}>
                <Factory className="w-6 h-6" style={{ color: statusConfig[selectedMachineData.status]?.color }} />
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm font-bold text-foreground">Станок {selectedMachineData.number} — {selectedMachineData.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded px-2 py-0.5 text-[10px] font-mono"
                    style={{ background: statusConfig[selectedMachineData.status]?.bg, color: statusConfig[selectedMachineData.status]?.color }}>
                    {statusConfig[selectedMachineData.status]?.label}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1 font-mono text-xs">
                <History className="w-3.5 h-3.5" /> {showHistory ? "Скрыть" : "История"}
              </Button>
            </div>

            {/* Create order form */}
            {showCreateOrder && canManage && (
              <div className="rounded-xl border border-primary/30 p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-foreground">Новый заказ</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowCreateOrder(false)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Продукция *</label>
                    <select value={product} onChange={(e) => setProduct(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }}>
                      <option value="">Выберите продукцию...</option>
                      {getOptions("molds").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Цвет</label>
                    <select value={color} onChange={(e) => setColor(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }}>
                      <option value="">Выберите цвет...</option>
                      {getOptions("colors").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Количество (кор.) *</label>
                    <input type="number" value={quantity || ""} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Пресс-форма</label>
                    <select value={moldName} onChange={(e) => setMoldName(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }}>
                      <option value="">Выберите пресс-форму...</option>
                      {getOptions("molds").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Примечания</label>
                    <input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Необязательно"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }} />
                  </div>
                </div>
                <Button onClick={() => {
                  if (!product.trim() || !quantity) { toast.error("Укажите продукцию и количество"); return; }
                  createOrderMutation.mutate({
                    machineId: selectedMachine,
                    product: product.trim(),
                    color: color.trim() || undefined,
                    quantity,
                    moldName: moldName.trim() || undefined,
                    notes: orderNotes.trim() || undefined,
                  });
                }} disabled={createOrderMutation.isPending} className="font-mono text-xs">
                  {createOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Создать заказ
                </Button>
              </div>
            )}

            {/* Orders list */}
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="p-4 border-b border-border">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {showHistory ? "Все заказы" : "Активные заказы"}
                </span>
              </div>
              {machineOrdersQuery.isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (() => {
                const orders = (machineOrdersQuery.data ?? []).filter((o: any) =>
                  showHistory ? true : (o.status === "pending" || o.status === "in_progress")
                );
                return orders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {showHistory ? "Нет заказов для этого станка" : "Нет активных заказов"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {orders.map((order: any) => {
                      const os = orderStatusConfig[order.status] ?? orderStatusConfig.pending;
                      const remaining = Math.max(0, order.quantity - (order.completedQty ?? 0));
                      const completedQty = order.completedQty ?? 0;
                      const progressPercent = order.quantity > 0 ? Math.min(100, (completedQty / order.quantity) * 100) : 0;
                      return (
                        <div key={order.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4" style={{ color: os.color }} />
                                <span className="font-mono text-sm font-semibold text-foreground">{order.product}</span>
                                <span className="rounded px-1.5 py-0.5 text-[9px] font-mono" style={{ background: `${os.color}20`, color: os.color }}>
                                  {os.label}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                                {order.color && <span>Цвет: {order.color}</span>}
                                {order.moldName && <span>ПФ: {order.moldName}</span>}
                              </div>
                              {/* Plan / Completed / Remaining */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  План: <span className="text-foreground font-semibold">{order.quantity} кор.</span>
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: "oklch(0.7 0.18 145)" }}>
                                  Выполнено: <span className="font-semibold">{completedQty} кор.</span>
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: remaining > 0 ? "oklch(0.65 0.18 200)" : "oklch(0.7 0.18 145)" }}>
                                  Осталось: <span className="font-semibold">{remaining} кор.</span>
                                </span>
                              </div>
                              {order.notes && <p className="text-[10px] text-muted-foreground mt-1">{order.notes}</p>}
                              <p className="text-[9px] text-muted-foreground mt-1">
                                Создан: {new Date(order.createdAt).toLocaleString("ru-RU")}
                              </p>
                            </div>
                            {/* Status actions */}
                            <div className="flex flex-col gap-1 ml-3">
                              {order.status === "pending" && (
                                <Button size="sm" variant="outline" className="text-[10px] font-mono h-7 px-2"
                                  onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "in_progress" })}>
                                  В работу
                                </Button>
                              )}
                              {order.status === "in_progress" && (
                                <Button size="sm" variant="outline" className="text-[10px] font-mono h-7 px-2"
                                  style={{ borderColor: "oklch(0.7 0.18 145 / 0.3)", color: "oklch(0.7 0.18 145)" }}
                                  onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "completed" })}>
                                  Выполнен
                                </Button>
                              )}
                              {canManage && order.status !== "cancelled" && order.status !== "completed" && (
                                <Button size="sm" variant="ghost" className="text-[10px] font-mono h-7 px-2 text-muted-foreground"
                                  onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "cancelled" })}>
                                  Отменить
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Progress bar */}
                          {(order.status === "in_progress" || order.status === "pending") && order.quantity > 0 && (
                            <div className="space-y-1">
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.012 260)" }}>
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${progressPercent}%`,
                                  background: progressPercent >= 100 ? "oklch(0.7 0.18 145)" : os.color,
                                }} />
                              </div>
                              <p className="text-[9px] font-mono text-muted-foreground text-right">{progressPercent.toFixed(0)}%</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
