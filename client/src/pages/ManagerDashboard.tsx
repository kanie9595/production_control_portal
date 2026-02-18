import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Eye,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

export default function ManagerDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [activePeriod, setActivePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const overviewQuery = trpc.dashboard.overview.useQuery(
    { periodType: activePeriod },
    { refetchInterval: 15000 } // Auto-refresh every 15 seconds
  );

  const isAdmin = user?.role === "admin";

  // Group by user
  const userGroups = useMemo(() => {
    if (!overviewQuery.data) return [];
    const map = new Map<number, typeof overviewQuery.data>();
    for (const item of overviewQuery.data) {
      if (!map.has(item.userId)) map.set(item.userId, []);
      map.get(item.userId)!.push(item);
    }
    return Array.from(map.entries()).map(([userId, items]) => ({
      userId,
      userName: items[0].userName,
      roleName: items[0].roleName,
      items,
      totalItems: items.reduce((sum, i) => sum + i.total, 0),
      completedItems: items.reduce((sum, i) => sum + i.completed, 0),
      overallPercent: items.reduce((sum, i) => sum + i.total, 0) > 0
        ? Math.round((items.reduce((sum, i) => sum + i.completed, 0) / items.reduce((sum, i) => sum + i.total, 0)) * 100)
        : 0,
    }));
  }, [overviewQuery.data]);

  // Summary stats
  const stats = useMemo(() => {
    const totalEmployees = userGroups.length;
    const fullyCompleted = userGroups.filter((g) => g.overallPercent === 100).length;
    const inProgress = userGroups.filter((g) => g.overallPercent > 0 && g.overallPercent < 100).length;
    const notStarted = userGroups.filter((g) => g.overallPercent === 0).length;
    const avgPercent = totalEmployees > 0
      ? Math.round(userGroups.reduce((sum, g) => sum + g.overallPercent, 0) / totalEmployees)
      : 0;
    return { totalEmployees, fullyCompleted, inProgress, notStarted, avgPercent };
  }, [userGroups]);

  const toggleExpand = useCallback((userId: number) => {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="text-sm text-muted-foreground">Доступ только для администратора</p>
          <Button variant="outline" onClick={() => setLocation("/")} className="mt-4 font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> На главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold text-foreground">Мониторинг</p>
            <p className="text-[10px] text-muted-foreground">Чек-листы сотрудников в реальном времени</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => overviewQuery.refetch()}
            className="font-mono text-xs"
            disabled={overviewQuery.isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Period tabs */}
        <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as "daily" | "weekly" | "monthly")} className="mb-6">
          <TabsList className="w-full max-w-sm" style={{ background: "oklch(0.2 0.012 260)" }}>
            <TabsTrigger value="daily" className="flex-1 font-mono text-xs">День</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 font-mono text-xs">Неделя</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 font-mono text-xs">Месяц</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <Users className="w-5 h-5 mb-2 text-muted-foreground" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalEmployees}</p>
            <p className="text-[10px] text-muted-foreground">Всего сотрудников</p>
          </div>
          <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <CheckCircle2 className="w-5 h-5 mb-2" style={{ color: "oklch(0.7 0.18 145)" }} />
            <p className="font-mono text-2xl font-bold" style={{ color: "oklch(0.7 0.18 145)" }}>{stats.fullyCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Завершили</p>
          </div>
          <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <Clock className="w-5 h-5 mb-2" style={{ color: "oklch(0.78 0.16 75)" }} />
            <p className="font-mono text-2xl font-bold" style={{ color: "oklch(0.78 0.16 75)" }}>{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">В процессе</p>
          </div>
          <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <AlertCircle className="w-5 h-5 mb-2 text-destructive" />
            <p className="font-mono text-2xl font-bold text-destructive">{stats.notStarted}</p>
            <p className="text-[10px] text-muted-foreground">Не начали</p>
          </div>
        </div>

        {/* Average progress */}
        <div className="rounded-xl border border-border p-4 mb-6" style={{ background: "oklch(0.18 0.012 260)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-mono">Средний прогресс</span>
            <span className="text-xs font-mono font-bold text-primary">{stats.avgPercent}%</span>
          </div>
          <Progress value={stats.avgPercent} className="h-2" />
        </div>

        {/* Employee list */}
        {userGroups.length === 0 && !overviewQuery.isLoading && (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет данных за текущий период</p>
            <p className="text-xs text-muted-foreground mt-1">Сотрудники ещё не начали заполнять чек-листы</p>
          </div>
        )}

        <div className="space-y-3">
          {userGroups.map((group) => (
            <div key={group.userId} className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
              <button
                onClick={() => toggleExpand(group.userId)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-mono text-sm font-bold"
                  style={{
                    background: group.overallPercent === 100
                      ? "oklch(0.7 0.18 145 / 0.15)"
                      : group.overallPercent > 0
                        ? "oklch(0.78 0.16 75 / 0.15)"
                        : "oklch(0.5 0.05 260 / 0.15)",
                    color: group.overallPercent === 100
                      ? "oklch(0.7 0.18 145)"
                      : group.overallPercent > 0
                        ? "oklch(0.78 0.16 75)"
                        : "oklch(0.5 0.05 260)",
                  }}
                >
                  {group.overallPercent}%
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{group.userName}</p>
                  <p className="text-[10px] text-muted-foreground">{group.roleName} · {group.completedItems}/{group.totalItems} пунктов</p>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={group.overallPercent} className="w-20 h-1.5" />
                  {expandedUser === group.userId ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {expandedUser === group.userId && (
                <div className="border-t border-border p-4 space-y-3">
                  {group.items.map((item) => (
                    <div key={item.instanceId} className="rounded-lg border border-border p-3" style={{ background: "oklch(0.16 0.01 260)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-mono font-semibold text-foreground">{item.templateTitle}</p>
                        <span className="text-xs font-mono" style={{
                          color: item.percent === 100 ? "oklch(0.7 0.18 145)" : "oklch(0.78 0.16 75)",
                        }}>
                          {item.completed}/{item.total}
                        </span>
                      </div>
                      <Progress value={item.percent} className="h-1.5 mb-3" />
                      <div className="space-y-1.5">
                        {item.items.map((ii) => {
                          const templateItem = ii.templateItemId;
                          return (
                            <div key={ii.id} className="flex items-start gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ii.checked ? "bg-green-500/20" : "bg-muted/30"}`}>
                                {ii.checked ? (
                                  <CheckCircle2 className="w-3 h-3" style={{ color: "oklch(0.7 0.18 145)" }} />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${ii.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                  Пункт #{ii.templateItemId}
                                </p>
                                {ii.note && (
                                  <p className="text-[10px] text-muted-foreground italic mt-0.5">📝 {ii.note}</p>
                                )}
                                {ii.checkedAt && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    ✓ {new Date(ii.checkedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
