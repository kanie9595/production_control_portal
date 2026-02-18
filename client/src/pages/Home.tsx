import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Factory,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  Loader2,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const seedMutation = trpc.seed.run.useMutation();

  // Auto-seed on first admin login
  useEffect(() => {
    if (user?.role === "admin" && isAuthenticated) {
      seedMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="max-w-md w-full mx-4">
          <div className="rounded-2xl border border-border p-8 text-center" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "oklch(0.78 0.16 75 / 0.15)" }}>
              <Factory className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-mono text-2xl font-bold text-foreground mb-2">MPC</h1>
            <p className="text-sm text-muted-foreground mb-1">Manus Production Control</p>
            <p className="text-xs text-muted-foreground mb-8">Система управления производственными чек-листами</p>
            <Button
              onClick={() => { window.location.href = getLoginUrl(); }}
              size="lg"
              className="w-full font-mono"
            >
              Войти в систему
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.78 0.16 75 / 0.15)" }}>
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-primary">MPC</p>
              <p className="text-[10px] text-muted-foreground">Production Control</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name ?? "Пользователь"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {isAdmin ? "Администратор" : (user?.productionRole ?? "Сотрудник")}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-mono text-2xl font-bold text-foreground mb-2">
            Добро пожаловать, {user?.name?.split(" ")[0] ?? "Пользователь"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Вы вошли как администратор. Выберите раздел для работы."
              : "Выберите ваш чек-лист для заполнения."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Employee checklist — always visible */}
          <button
            onClick={() => setLocation("/checklist")}
            className="rounded-xl border border-border p-6 text-left hover:border-primary/40 transition-all duration-300 group"
            style={{ background: "oklch(0.18 0.012 260)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}>
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-mono text-sm font-semibold text-foreground mb-1">Мой чек-лист</h3>
            <p className="text-xs text-muted-foreground">Заполнить чек-лист за текущий период</p>
          </button>

          {/* Admin-only sections */}
          {isAdmin && (
            <>
              <button
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl border border-border p-6 text-left hover:border-primary/40 transition-all duration-300 group"
                style={{ background: "oklch(0.18 0.012 260)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: "oklch(0.7 0.18 145 / 0.12)" }}>
                  <LayoutDashboard className="w-6 h-6" style={{ color: "oklch(0.7 0.18 145)" }} />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground mb-1">Мониторинг</h3>
                <p className="text-xs text-muted-foreground">Просмотр чек-листов сотрудников в реальном времени</p>
              </button>

              <button
                onClick={() => setLocation("/templates")}
                className="rounded-xl border border-border p-6 text-left hover:border-primary/40 transition-all duration-300 group"
                style={{ background: "oklch(0.18 0.012 260)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: "oklch(0.65 0.15 250 / 0.12)" }}>
                  <Settings className="w-6 h-6" style={{ color: "oklch(0.65 0.15 250)" }} />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground mb-1">Шаблоны чек-листов</h3>
                <p className="text-xs text-muted-foreground">Редактировать пункты чек-листов для всех должностей</p>
              </button>

              <button
                onClick={() => setLocation("/users")}
                className="rounded-xl border border-border p-6 text-left hover:border-primary/40 transition-all duration-300 group"
                style={{ background: "oklch(0.18 0.012 260)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: "oklch(0.6 0.22 25 / 0.12)" }}>
                  <Users className="w-6 h-6" style={{ color: "oklch(0.6 0.22 25)" }} />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground mb-1">Сотрудники</h3>
                <p className="text-xs text-muted-foreground">Управление ролями и назначение чек-листов</p>
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
