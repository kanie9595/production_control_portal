import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, BarChart3, Loader2, Calendar, Users, TrendingUp,
  Download, Filter, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Package, Beaker, Factory,
} from "lucide-react";
import { useState, useMemo } from "react";

const MANAGER_ROLES = ["production_manager", "production_director"];

type Tab = "checklists" | "products" | "materials";

export default function Analytics() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";
  const isManager = MANAGER_ROLES.includes(user?.productionRole ?? "");
  const canAccess = isAdmin || isManager;

  const rolesQuery = trpc.roles.list.useQuery();
  // @ts-ignore - analytics.checklistHistory exists on the server
  const historyQuery = (trpc.analytics as any).checklistHistory.useQuery(
    { dateFrom, dateTo, roleSlug: selectedRole || undefined },
    { enabled: canAccess && isAuthenticated && activeTab === "checklists" }
  );

  // Production analytics queries
  const productAnalytics = trpc.productionAnalytics.products.useQuery(undefined, {
    enabled: canAccess && isAuthenticated && activeTab === "products",
  });
  const materialAnalytics = trpc.productionAnalytics.materials.useQuery(undefined, {
    enabled: canAccess && isAuthenticated && activeTab === "materials",
  });
  const orderAnalytics = trpc.productionAnalytics.orders.useQuery(undefined, {
    enabled: canAccess && isAuthenticated && activeTab === "products",
  });

  const checklistStats = useMemo(() => {
    const data = historyQuery.data ?? [];
    if (data.length === 0) return { total: 0, avgPercent: 0, completed100: 0, byRole: [] as any[] };
    const total = data.length;
    const avgPercent = Math.round(data.reduce((s: number, d: any) => s + d.percent, 0) / total);
    const completed100 = data.filter((d: any) => d.percent === 100).length;
    const roleMap = new Map<string, { name: string; count: number; totalPercent: number }>();
    for (const d of data) {
      const key = (d as any).roleName ?? "Без роли";
      const existing = roleMap.get(key) ?? { name: key, count: 0, totalPercent: 0 };
      existing.count++;
      existing.totalPercent += (d as any).percent;
      roleMap.set(key, existing);
    }
    const byRole = Array.from(roleMap.values()).map(r => ({ ...r, avgPercent: Math.round(r.totalPercent / r.count) }));
    return { total, avgPercent, completed100, byRole };
  }, [historyQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Доступ ограничен</p>
          <Button onClick={() => setLocation("/")}>На главную</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      <header className="border-b border-border sticky top-0 z-10" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.6 0.2 280)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">Аналитика</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "oklch(0.14 0.01 260)" }}>
          <button onClick={() => setActiveTab("products")}
            className={`flex-1 px-4 py-2 rounded-md text-xs font-mono font-semibold transition-colors ${
              activeTab === "products" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Package className="w-3.5 h-3.5 inline mr-1.5" /> Продукция
          </button>
          <button onClick={() => setActiveTab("materials")}
            className={`flex-1 px-4 py-2 rounded-md text-xs font-mono font-semibold transition-colors ${
              activeTab === "materials" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Beaker className="w-3.5 h-3.5 inline mr-1.5" /> Сырьё
          </button>
          <button onClick={() => setActiveTab("checklists")}
            className={`flex-1 px-4 py-2 rounded-md text-xs font-mono font-semibold transition-colors ${
              activeTab === "checklists" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" /> Чек-листы
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ============ PRODUCTS TAB ============ */}
        {activeTab === "products" && (
          <>
            {/* Order stats */}
            {orderAnalytics.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {(() => {
                    const data = orderAnalytics.data ?? [];
                    const totalOrders = data.length;
                    const totalQty = data.reduce((s: number, o: any) => s + (o.quantity || 0), 0);
                    const totalCompleted = data.reduce((s: number, o: any) => s + (o.completedQty || 0), 0);
                    const completedOrders = data.filter((o: any) => o.status === "completed").length;
                    return (
                      <>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Factory className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Всего заказов</span>
                          </div>
                          <p className="font-mono text-3xl font-bold text-foreground">{totalOrders}</p>
                        </div>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Общий план (кор.)</span>
                          </div>
                          <p className="font-mono text-3xl font-bold text-foreground">{totalQty.toLocaleString("ru-RU")}</p>
                        </div>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Выполнено (кор.)</span>
                          </div>
                          <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>{totalCompleted.toLocaleString("ru-RU")}</p>
                        </div>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Завершённых</span>
                          </div>
                          <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>{completedOrders}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Product breakdown */}
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="p-4 border-b border-border">
                    <span className="font-mono text-xs font-semibold text-foreground">Продукция по заказам</span>
                  </div>
                  {productAnalytics.isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (productAnalytics.data ?? []).length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Нет данных</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                            <th className="text-left py-2.5 px-4 text-muted-foreground font-mono">Продукция</th>
                            <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Заказов</th>
                            <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">План (кор.)</th>
                            <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Факт (кор.)</th>
                            <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Выполнение</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(productAnalytics.data ?? []).map((p: any, i: number) => {
                            const pct = p.totalQty > 0 ? Math.round((p.totalCompleted / p.totalQty) * 100) : 0;
                            return (
                              <tr key={i} className="border-b border-border/50 hover:bg-white/5">
                                <td className="py-2.5 px-4 text-foreground font-medium">{p.product}</td>
                                <td className="py-2.5 px-4 text-right font-mono">{p.orderCount}</td>
                                <td className="py-2.5 px-4 text-right font-mono">{p.totalQty?.toLocaleString("ru-RU")}</td>
                                <td className="py-2.5 px-4 text-right font-mono" style={{ color: "oklch(0.7 0.18 145)" }}>
                                  {p.totalCompleted?.toLocaleString("ru-RU")}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.012 260)" }}>
                                      <div className="h-full rounded-full" style={{
                                        width: `${Math.min(pct, 100)}%`,
                                        background: pct >= 80 ? "oklch(0.7 0.18 145)" : pct >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)"
                                      }} />
                                    </div>
                                    <span className="font-mono text-[10px]" style={{
                                      color: pct >= 80 ? "oklch(0.7 0.18 145)" : pct >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)"
                                    }}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Orders by machine */}
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="p-4 border-b border-border">
                    <span className="font-mono text-xs font-semibold text-foreground">Заказы по станкам</span>
                  </div>
                  {(() => {
                    const data = orderAnalytics.data ?? [];
                    const byMachine = new Map<string, { machine: string; orders: number; totalQty: number; completed: number }>();
                    for (const o of data) {
                      const key = (o as any).machineName || `Станок #${(o as any).machineId}`;
                      const existing = byMachine.get(key) ?? { machine: key, orders: 0, totalQty: 0, completed: 0 };
                      existing.orders++;
                      existing.totalQty += (o as any).quantity || 0;
                      existing.completed += (o as any).completedQty || 0;
                      byMachine.set(key, existing);
                    }
                    const machines = Array.from(byMachine.values()).sort((a, b) => b.totalQty - a.totalQty);
                    if (machines.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Нет данных</div>;
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                              <th className="text-left py-2.5 px-4 text-muted-foreground font-mono">Станок</th>
                              <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Заказов</th>
                              <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">План (кор.)</th>
                              <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Факт (кор.)</th>
                              <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {machines.map((m, i) => {
                              const pct = m.totalQty > 0 ? Math.round((m.completed / m.totalQty) * 100) : 0;
                              return (
                                <tr key={i} className="border-b border-border/50 hover:bg-white/5">
                                  <td className="py-2.5 px-4 text-foreground font-medium">{m.machine}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">{m.orders}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">{m.totalQty.toLocaleString("ru-RU")}</td>
                                  <td className="py-2.5 px-4 text-right font-mono" style={{ color: "oklch(0.7 0.18 145)" }}>
                                    {m.completed.toLocaleString("ru-RU")}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono" style={{
                                    color: pct >= 80 ? "oklch(0.7 0.18 145)" : pct >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)"
                                  }}>{pct}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        )}

        {/* ============ MATERIALS TAB ============ */}
        {activeTab === "materials" && (
          <>
            {materialAnalytics.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (materialAnalytics.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground" style={{ background: "oklch(0.18 0.012 260)" }}>
                Нет данных по сырью. Создайте заказы с привязанными рецептами для появления аналитики.
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(() => {
                    const data = materialAnalytics.data ?? [];
                    const totalMaterials = data.length;
                    const totalCalcKg = data.reduce((s: number, m: any) => s + parseFloat(m.totalCalcKg || "0"), 0);
                    const totalActualKg = data.reduce((s: number, m: any) => s + parseFloat(m.totalActualKg || "0"), 0);
                    return (
                      <>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Beaker className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Видов сырья</span>
                          </div>
                          <p className="font-mono text-3xl font-bold text-foreground">{totalMaterials}</p>
                        </div>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Расчёт (кг)</span>
                          </div>
                          <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.65 0.18 200)" }}>
                            {totalCalcKg.toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Факт (кг)</span>
                          </div>
                          <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>
                            {totalActualKg.toFixed(1)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Materials table */}
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="p-4 border-b border-border">
                    <span className="font-mono text-xs font-semibold text-foreground">Расход сырья по материалам</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                          <th className="text-left py-2.5 px-4 text-muted-foreground font-mono">Материал</th>
                          <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Заявок</th>
                          <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Расчёт (кг)</th>
                          <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Факт (кг)</th>
                          <th className="text-right py-2.5 px-4 text-muted-foreground font-mono">Разница</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(materialAnalytics.data ?? []).map((m: any, i: number) => {
                          const calcKg = parseFloat(m.totalCalcKg || "0");
                          const actualKg = parseFloat(m.totalActualKg || "0");
                          const diff = actualKg - calcKg;
                          return (
                            <tr key={i} className="border-b border-border/50 hover:bg-white/5">
                              <td className="py-2.5 px-4 text-foreground font-medium">{m.materialName}</td>
                              <td className="py-2.5 px-4 text-right font-mono">{m.requestCount}</td>
                              <td className="py-2.5 px-4 text-right font-mono" style={{ color: "oklch(0.65 0.18 200)" }}>
                                {calcKg.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono" style={{ color: "oklch(0.7 0.18 145)" }}>
                                {actualKg.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono" style={{
                                color: Math.abs(diff) < 0.01 ? "oklch(0.6 0 0)" : diff > 0 ? "oklch(0.65 0.25 25)" : "oklch(0.7 0.18 145)"
                              }}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(2)} кг
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ============ CHECKLISTS TAB ============ */}
        {activeTab === "checklists" && (
          <>
            {/* Filters */}
            <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs font-semibold text-foreground">Фильтры</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Дата от</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                    style={{ background: "oklch(0.22 0.012 260)" }} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Дата до</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                    style={{ background: "oklch(0.22 0.012 260)" }} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Должность</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                    style={{ background: "oklch(0.22 0.012 260)" }}>
                    <option value="">Все должности</option>
                    {(rolesQuery.data ?? []).map((r: any) => (
                      <option key={r.id} value={r.slug}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Всего записей</span>
                </div>
                <p className="font-mono text-3xl font-bold text-foreground">{checklistStats.total}</p>
              </div>
              <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Средний %</span>
                </div>
                <p className="font-mono text-3xl font-bold" style={{ color: checklistStats.avgPercent >= 80 ? "oklch(0.7 0.18 145)" : checklistStats.avgPercent >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)" }}>
                  {checklistStats.avgPercent}%
                </p>
              </div>
              <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Выполнено на 100%</span>
                </div>
                <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>{checklistStats.completed100}</p>
              </div>
            </div>

            {/* By role */}
            {checklistStats.byRole.length > 0 && (
              <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-xs font-semibold text-foreground">По должностям</span>
                </div>
                <div className="space-y-3">
                  {checklistStats.byRole.map((r: any) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-48 truncate">{r.name}</span>
                      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.012 260)" }}>
                        <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(r.avgPercent, 5)}%`, background: r.avgPercent >= 80 ? "oklch(0.7 0.18 145 / 0.6)" : r.avgPercent >= 50 ? "oklch(0.78 0.16 75 / 0.6)" : "oklch(0.65 0.25 25 / 0.6)" }}>
                          <span className="text-[10px] font-mono font-bold text-foreground">{r.avgPercent}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-16 text-right">{r.count} зап.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail table */}
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="p-4 border-b border-border">
                <span className="font-mono text-xs font-semibold text-foreground">История чек-листов</span>
              </div>
              {historyQuery.isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (historyQuery.data ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период</div>
              ) : (
                <div className="divide-y divide-border">
                  {(historyQuery.data ?? []).map((row: any, idx: number) => (
                    <div key={idx}>
                      <button onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                          style={{ background: row.percent === 100 ? "oklch(0.7 0.18 145 / 0.15)" : row.percent >= 50 ? "oklch(0.78 0.16 75 / 0.15)" : "oklch(0.65 0.25 25 / 0.15)",
                            color: row.percent === 100 ? "oklch(0.7 0.18 145)" : row.percent >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)" }}>
                          {row.percent}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{row.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{row.roleName} — {row.templateTitle}</p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{row.dateKey}</span>
                        <span className="text-xs text-muted-foreground">{row.completed}/{row.total}</span>
                        {expandedRow === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {expandedRow === idx && row.items && (
                        <div className="px-4 pb-3 pl-16 space-y-1">
                          {row.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {item.checked ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.7 0.18 145)" }} /> : <Circle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                              <span className={item.checked ? "text-foreground" : "text-muted-foreground"}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
