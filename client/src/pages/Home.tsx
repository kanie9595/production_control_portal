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
  HelpCircle,
  BarChart3,
  ListTodo,
  FileText,
  Cpu,
  FlaskConical,
  BookOpen,
  Shield,
} from "lucide-react";
import { useEffect, useMemo } from "react";

const MANAGER_ROLES = ["production_manager", "production_director"];

// Map module keys to route paths
const MODULE_ROUTE_MAP: Record<string, string> = {
  checklist: "/checklist",
  tasks: "/tasks",
  reports: "/reports",
  orders: "/orders",
  recipes: "/recipes",
  monitoring: "/dashboard",
  analytics: "/analytics",
  dictionaries: "/dictionaries",
};

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const seedMutation = trpc.seed.run.useMutation();

  // Fetch permissions for current user
  const permissionsQuery = trpc.permissions.forCurrentUser.useQuery(undefined, {
    enabled: isAuthenticated && !!user?.productionRole,
  });

  useEffect(() => {
    if (user?.role === "admin" && isAuthenticated) {
      seedMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, isAuthenticated]);

  const isAdmin = user?.role === "admin";
  const isManager = useMemo(
    () => MANAGER_ROLES.includes(user?.productionRole ?? ""),
    [user?.productionRole]
  );
  const canViewDashboard = isAdmin || isManager;

  // Build set of accessible modules from permissions
  const accessibleModules = useMemo(() => {
    if (isAdmin) return null; // Admin sees everything
    if (!permissionsQuery.data || permissionsQuery.data.length === 0) {
      // If no permissions loaded yet, show default based on role
      if (isManager) return null; // Managers see everything
      return new Set(["checklist", "tasks"]); // Default for non-managers
    }
    const modules = new Set<string>();
    for (const perm of permissionsQuery.data) {
      if (perm.hasAccess) modules.add(perm.module);
    }
    return modules;
  }, [isAdmin, isManager, permissionsQuery.data]);

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (isAdmin) return true;
    if (accessibleModules === null) return true; // Managers
    return accessibleModules.has(moduleKey);
  };

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
            <p className="text-xs text-muted-foreground mb-8">Система управления производством</p>
            <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full font-mono">
              Войти в систему
            </Button>
            <button onClick={() => setLocation("/how-to-register")} className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mx-auto">
              <HelpCircle className="w-3.5 h-3.5" />
              Как зарегистрироваться?
            </button>
          </div>
        </div>
      </div>
    );
  }

  const productionRoleLabel = (() => {
    const role = user?.productionRole;
    if (!role) return "Сотрудник";
    const roleNames: Record<string, string> = {
      packer: "Упаковщик", adjuster: "Наладчик ТПА", mechanic: "Механик",
      shift_supervisor: "Начальник смены", production_manager: "Начальник производства",
      production_director: "Директор производства", shift_assistant: "Помощница начальника смены",
      packer_foreman: "Бригадир упаковщиков", senior_mechanic: "Старший механик",
      senior_adjuster: "Старший наладчик ТПА",
    };
    return roleNames[role] ?? role;
  })();

  type NavCard = { path: string; icon: React.ReactNode; iconBg: string; title: string; desc: string; visible: boolean; moduleKey?: string };

  const navCards: NavCard[] = [
    { path: "/checklist", icon: <ClipboardList className="w-6 h-6 text-primary" />, iconBg: "oklch(0.78 0.16 75 / 0.12)", title: "Мой чек-лист", desc: "Заполнить чек-лист за текущий период", visible: true, moduleKey: "checklist" },
    { path: "/tasks", icon: <ListTodo className="w-6 h-6" style={{ color: "oklch(0.72 0.19 60)" }} />, iconBg: "oklch(0.72 0.19 60 / 0.12)", title: "Задачи", desc: "Просмотр и выполнение назначенных задач", visible: true, moduleKey: "tasks" },
    { path: "/reports", icon: <FileText className="w-6 h-6" style={{ color: "oklch(0.65 0.18 200)" }} />, iconBg: "oklch(0.65 0.18 200 / 0.12)", title: "Отчёты", desc: "Сменные отчёты по производству", visible: true, moduleKey: "reports" },
    { path: "/orders", icon: <Cpu className="w-6 h-6" style={{ color: "oklch(0.7 0.15 170)" }} />, iconBg: "oklch(0.7 0.15 170 / 0.12)", title: "Заказы", desc: "Заказы на 27 станках производства", visible: true, moduleKey: "orders" },
    { path: "/recipes", icon: <FlaskConical className="w-6 h-6" style={{ color: "oklch(0.65 0.2 310)" }} />, iconBg: "oklch(0.65 0.2 310 / 0.12)", title: "Сырьё", desc: "Рецепты сырья для заказов", visible: true, moduleKey: "recipes" },
    { path: "/dashboard", icon: <LayoutDashboard className="w-6 h-6" style={{ color: "oklch(0.7 0.18 145)" }} />, iconBg: "oklch(0.7 0.18 145 / 0.12)", title: "Мониторинг", desc: "Просмотр чек-листов сотрудников", visible: canViewDashboard, moduleKey: "monitoring" },
    { path: "/analytics", icon: <BarChart3 className="w-6 h-6" style={{ color: "oklch(0.6 0.2 280)" }} />, iconBg: "oklch(0.6 0.2 280 / 0.12)", title: "Аналитика", desc: "История и статистика чек-листов", visible: canViewDashboard, moduleKey: "analytics" },
    { path: "/dictionaries", icon: <BookOpen className="w-6 h-6" style={{ color: "oklch(0.65 0.15 130)" }} />, iconBg: "oklch(0.65 0.15 130 / 0.12)", title: "Справочники", desc: "Управление списками выбора в отчётах", visible: canViewDashboard || isAdmin, moduleKey: "dictionaries" },
    { path: "/permissions", icon: <Shield className="w-6 h-6" style={{ color: "oklch(0.6 0.2 280)" }} />, iconBg: "oklch(0.6 0.2 280 / 0.12)", title: "Управление правами", desc: "Настройка доступа к модулям по ролям", visible: canViewDashboard },
    { path: "/templates", icon: <Settings className="w-6 h-6" style={{ color: "oklch(0.65 0.15 250)" }} />, iconBg: "oklch(0.65 0.15 250 / 0.12)", title: "Шаблоны чек-листов", desc: "Редактировать пункты чек-листов", visible: isAdmin },
    { path: "/users", icon: <Users className="w-6 h-6" style={{ color: "oklch(0.6 0.22 25)" }} />, iconBg: "oklch(0.6 0.22 25 / 0.12)", title: "Сотрудники", desc: "Управление ролями сотрудников", visible: isAdmin },
    { path: "/how-to-register", icon: <HelpCircle className="w-6 h-6" style={{ color: "oklch(0.5 0.1 280)" }} />, iconBg: "oklch(0.5 0.1 280 / 0.12)", title: "Как зарегистрироваться", desc: "Инструкция для новых сотрудников", visible: true },
  ];

  // Filter cards by visibility AND permissions
  const visibleCards = navCards.filter((card) => {
    if (!card.visible) return false;
    // Cards without moduleKey are always visible (admin-only, help, etc.)
    if (!card.moduleKey) return true;
    return hasModuleAccess(card.moduleKey);
  });

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
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
                {isAdmin ? "Администратор" : productionRoleLabel}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-mono text-2xl font-bold text-foreground mb-2">
            Добро пожаловать, {user?.name?.split(" ")[0] ?? "Пользователь"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Вы вошли как администратор. Выберите раздел для работы."
              : canViewDashboard
                ? "Управляйте производством: чек-листы, задачи, отчёты, заказы."
                : "Выберите раздел для работы."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <button
              key={card.path}
              onClick={() => setLocation(card.path)}
              className="rounded-xl border border-border p-6 text-left hover:border-primary/40 transition-all duration-300 group"
              style={{ background: "oklch(0.18 0.012 260)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: card.iconBg }}>
                {card.icon}
              </div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
