import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, BarChart3, Loader2, Calendar, Users, TrendingUp,
  Download, Filter, ChevronDown, ChevronUp, CheckCircle2, Circle,
} from "lucide-react";
import { useState, useMemo } from "react";

const MANAGER_ROLES = ["production_manager", "production_director"];

export default function Analytics() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
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
  const historyQuery = trpc.analytics.checklistHistory.useQuery(
    { dateFrom, dateTo, roleSlug: selectedRole || undefined },
    { enabled: canAccess && isAuthenticated }
  );

  const stats = useMemo(() => {
    const data = historyQuery.data ?? [];
    if (data.length === 0) return { total: 0, avgPercent: 0, completed100: 0, byRole: [] as any[] };
    const total = data.length;
    const avgPercent = Math.round(data.reduce((s, d) => s + (d as any).percent, 0) / total);
    const completed100 = data.filter((d) => (d as any).percent === 100).length;
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

  const handleExportPdf = () => {
    const data = historyQuery.data ?? [];
    const printContent = `
      <html><head><meta charset="utf-8"><title>Аналитика чек-листов</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      h1{font-size:18px;margin-bottom:5px}h2{font-size:14px;margin-top:20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#f0f0f0;font-weight:bold}.stats{display:flex;gap:20px;margin:10px 0}
      .stat-box{border:1px solid #ddd;padding:10px;border-radius:4px;text-align:center;flex:1}
      .stat-value{font-size:20px;font-weight:bold}.stat-label{font-size:10px;color:#666}</style></head>
      <body><h1>Аналитика чек-листов</h1>
      <p>Период: ${dateFrom} — ${dateTo}</p>
      <div class="stats">
        <div class="stat-box"><div class="stat-value">${stats.total}</div><div class="stat-label">Всего записей</div></div>
        <div class="stat-box"><div class="stat-value">${stats.avgPercent}%</div><div class="stat-label">Средний %</div></div>
        <div class="stat-box"><div class="stat-value">${stats.completed100}</div><div class="stat-label">Выполнено на 100%</div></div>
      </div>
      <h2>По должностям</h2>
      <table><tr><th>Должность</th><th>Кол-во</th><th>Средний %</th></tr>
      ${stats.byRole.map(r => `<tr><td>${r.name}</td><td>${r.count}</td><td>${r.avgPercent}%</td></tr>`).join("")}
      </table>
      <h2>Детализация</h2>
      <table><tr><th>Дата</th><th>Сотрудник</th><th>Должность</th><th>Чек-лист</th><th>Выполнено</th></tr>
      ${data.map((d: any) => `<tr><td>${d.dateKey}</td><td>${d.userName}</td><td>${d.roleName}</td><td>${d.templateTitle}</td><td>${d.completed}/${d.total} (${d.percent}%)</td></tr>`).join("")}
      </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

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
            <h1 className="font-mono text-sm font-semibold text-foreground">Аналитика чек-листов</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2 font-mono text-xs">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
                {(rolesQuery.data ?? []).map((r) => (
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
            <p className="font-mono text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Средний %</span>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: stats.avgPercent >= 80 ? "oklch(0.7 0.18 145)" : stats.avgPercent >= 50 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.25 25)" }}>
              {stats.avgPercent}%
            </p>
          </div>
          <div className="rounded-xl border border-border p-5" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Выполнено на 100%</span>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>{stats.completed100}</p>
          </div>
        </div>

        {/* By role breakdown */}
        {stats.byRole.length > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-xs font-semibold text-foreground">По должностям</span>
            </div>
            <div className="space-y-3">
              {stats.byRole.map((r) => (
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
      </main>
    </div>
  );
}
