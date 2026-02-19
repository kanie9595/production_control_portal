import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Factory,
  ArrowLeft,
  Loader2,
  Shield,
  Check,
  X,
  Save,
  ClipboardList,
  ListTodo,
  FileText,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const MANAGER_ROLES = ["production_manager", "production_director"];

type ModuleInfo = {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
};

const MODULES: ModuleInfo[] = [
  { key: "checklist", label: "Чек-листы", icon: <ClipboardList className="w-4 h-4" />, description: "Заполнение чек-листов" },
  { key: "tasks", label: "Задачи", icon: <ListTodo className="w-4 h-4" />, description: "Просмотр и выполнение задач" },
  { key: "reports", label: "Отчёты", icon: <FileText className="w-4 h-4" />, description: "Сменные отчёты" },
  { key: "orders", label: "Заказы", icon: <Cpu className="w-4 h-4" />, description: "Заказы на станках" },
  { key: "recipes", label: "Сырьё", icon: <FlaskConical className="w-4 h-4" />, description: "Рецепты сырья" },
  { key: "monitoring", label: "Мониторинг", icon: <LayoutDashboard className="w-4 h-4" />, description: "Мониторинг чек-листов" },
  { key: "analytics", label: "Аналитика", icon: <BarChart3 className="w-4 h-4" />, description: "Аналитика и статистика" },
  { key: "dictionaries", label: "Справочники", icon: <BookOpen className="w-4 h-4" />, description: "Управление справочниками" },
];

export default function Permissions() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const isAdmin = user?.role === "admin";
  const isManager = useMemo(
    () => MANAGER_ROLES.includes(user?.productionRole ?? ""),
    [user?.productionRole]
  );
  const canManage = isAdmin || isManager;

  const rolesQuery = trpc.roles.list.useQuery();
  const permissionsQuery = trpc.permissions.all.useQuery(undefined, { enabled: canManage });
  const bulkUpdateMutation = trpc.permissions.bulkUpdate.useMutation({
    onSuccess: () => {
      permissionsQuery.refetch();
      setHasChanges(false);
      toast.success("Права доступа сохранены");
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  });

  // Build local permissions state from server data
  useEffect(() => {
    if (!permissionsQuery.data || !rolesQuery.data) return;
    const perms: Record<string, Record<string, boolean>> = {};
    for (const role of rolesQuery.data) {
      perms[role.slug] = {};
      for (const mod of MODULES) {
        // Default: managers get all, others get checklist + tasks
        const isManagerRole = MANAGER_ROLES.includes(role.slug);
        perms[role.slug][mod.key] = isManagerRole ? true : ["checklist", "tasks"].includes(mod.key);
      }
    }
    // Override with actual DB values
    for (const perm of permissionsQuery.data) {
      if (perms[perm.roleSlug]) {
        perms[perm.roleSlug][perm.module] = perm.hasAccess;
      }
    }
    setLocalPermissions(perms);
    setHasChanges(false);
  }, [permissionsQuery.data, rolesQuery.data]);

  const togglePermission = (roleSlug: string, module: string) => {
    setLocalPermissions((prev) => {
      const updated = { ...prev };
      updated[roleSlug] = { ...updated[roleSlug] };
      updated[roleSlug][module] = !updated[roleSlug][module];
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const permissions: Array<{ roleSlug: string; module: string; hasAccess: boolean }> = [];
    for (const [roleSlug, modules] of Object.entries(localPermissions)) {
      for (const [module, hasAccess] of Object.entries(modules)) {
        permissions.push({ roleSlug, module, hasAccess });
      }
    }
    bulkUpdateMutation.mutate({ permissions });
  };

  const handleSelectAll = (roleSlug: string) => {
    setLocalPermissions((prev) => {
      const updated = { ...prev };
      updated[roleSlug] = { ...updated[roleSlug] };
      for (const mod of MODULES) {
        updated[roleSlug][mod.key] = true;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleDeselectAll = (roleSlug: string) => {
    setLocalPermissions((prev) => {
      const updated = { ...prev };
      updated[roleSlug] = { ...updated[roleSlug] };
      for (const mod of MODULES) {
        updated[roleSlug][mod.key] = false;
      }
      return updated;
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Доступ запрещён</p>
          <p className="text-muted-foreground text-xs mt-1">Только Начальник и Директор производства</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/")}>
            На главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.6 0.2 280 / 0.15)" }}>
              <Shield className="w-5 h-5" style={{ color: "oklch(0.6 0.2 280)" }} />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-primary">Управление правами</p>
              <p className="text-[10px] text-muted-foreground">Настройка доступа к модулям по ролям</p>
            </div>
          </div>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={bulkUpdateMutation.isPending}
              className="font-mono"
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Сохранить
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {permissionsQuery.isLoading || rolesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="rounded-xl border border-border p-4 mb-6 flex items-start gap-3" style={{ background: "oklch(0.2 0.02 260)" }}>
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-foreground font-medium">Матрица доступа</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Включайте и выключайте доступ к модулям для каждой роли. Изменения вступят в силу после сохранения.
                  Начальник и Директор производства всегда имеют полный доступ.
                </p>
              </div>
            </div>

            {/* Permissions matrix */}
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "oklch(0.14 0.01 260)" }}>
                      <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider border-b border-border sticky left-0 z-10" style={{ background: "oklch(0.14 0.01 260)", minWidth: "200px" }}>
                        Роль
                      </th>
                      {MODULES.map((mod) => (
                        <th key={mod.key} className="text-center px-3 py-3 text-xs font-mono text-muted-foreground border-b border-border" style={{ minWidth: "100px" }}>
                          <div className="flex flex-col items-center gap-1">
                            {mod.icon}
                            <span className="text-[10px]">{mod.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 text-xs font-mono text-muted-foreground border-b border-border" style={{ minWidth: "120px" }}>
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesQuery.data?.map((role, idx) => {
                      const isManagerRole = MANAGER_ROLES.includes(role.slug);
                      const rolePerms = localPermissions[role.slug] ?? {};
                      const enabledCount = Object.values(rolePerms).filter(Boolean).length;

                      return (
                        <tr
                          key={role.slug}
                          className="border-b border-border/50 last:border-b-0"
                          style={{ background: idx % 2 === 0 ? "oklch(0.19 0.012 260)" : "oklch(0.18 0.012 260)" }}
                        >
                          <td className="px-4 py-3 sticky left-0 z-10" style={{ background: idx % 2 === 0 ? "oklch(0.19 0.012 260)" : "oklch(0.18 0.012 260)" }}>
                            <div>
                              <p className="text-sm font-medium text-foreground">{role.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {enabledCount}/{MODULES.length} модулей
                                {isManagerRole && (
                                  <span className="ml-2 text-primary">● Руководитель</span>
                                )}
                              </p>
                            </div>
                          </td>
                          {MODULES.map((mod) => {
                            const hasAccess = rolePerms[mod.key] ?? false;
                            return (
                              <td key={mod.key} className="text-center px-3 py-3">
                                <button
                                  onClick={() => togglePermission(role.slug, mod.key)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all duration-200 ${
                                    hasAccess
                                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                      : "bg-red-500/10 text-red-400/50 hover:bg-red-500/20"
                                  }`}
                                  title={hasAccess ? "Доступ разрешён" : "Доступ запрещён"}
                                >
                                  {hasAccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="text-center px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAll(role.slug)}
                                className="text-[10px] h-6 px-2 text-green-400 hover:text-green-300"
                              >
                                Все
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeselectAll(role.slug)}
                                className="text-[10px] h-6 px-2 text-red-400 hover:text-red-300"
                              >
                                Нет
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                <span>Доступ разрешён</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-500/10 flex items-center justify-center">
                  <X className="w-3 h-3 text-red-400/50" />
                </div>
                <span>Доступ запрещён</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
