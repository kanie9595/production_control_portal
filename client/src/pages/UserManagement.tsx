import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  Shield,
  User,
} from "lucide-react";

export default function UserManagement() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const usersQuery = trpc.users.list.useQuery(undefined, { enabled: isAdmin });
  const rolesQuery = trpc.roles.list.useQuery();
  const setRoleMutation = trpc.users.setProductionRole.useMutation({
    onSuccess: () => {
      toast.success("Роль обновлена");
      usersQuery.refetch();
    },
  });

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
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold text-foreground">Управление сотрудниками</p>
            <p className="text-[10px] text-muted-foreground">Назначение производственных ролей</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Info */}
        <div className="rounded-xl border border-border p-4 mb-6" style={{ background: "oklch(0.18 0.012 260)" }}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Как это работает</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Назначьте каждому сотруднику его производственную должность. После этого при входе в систему
                сотрудник увидит чек-лист, соответствующий его роли. Вы можете изменить роль в любой момент.
              </p>
            </div>
          </div>
        </div>

        {/* Users list */}
        {usersQuery.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {usersQuery.data && usersQuery.data.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет зарегистрированных пользователей</p>
            <p className="text-xs text-muted-foreground mt-1">Сотрудники появятся после первого входа в систему</p>
          </div>
        )}

        <div className="space-y-3">
          {usersQuery.data?.map((u) => (
            <div key={u.id} className="rounded-xl border border-border p-4 flex items-center gap-4" style={{ background: "oklch(0.18 0.012 260)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "oklch(0.25 0.015 260)" }}>
                {u.role === "admin" ? (
                  <Shield className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.name ?? "Без имени"}</p>
                <p className="text-[10px] text-muted-foreground">{u.email ?? "—"}</p>
                {u.role === "admin" && (
                  <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded mt-1" style={{ background: "oklch(0.78 0.16 75 / 0.15)", color: "oklch(0.78 0.16 75)" }}>
                    ADMIN
                  </span>
                )}
              </div>
              <div className="w-48 shrink-0">
                <Select
                  value={u.productionRole ?? "none"}
                  onValueChange={(value) => {
                    setRoleMutation.mutate({
                      userId: u.id,
                      productionRole: value === "none" ? null : value,
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-mono" style={{ background: "oklch(0.16 0.01 260)" }}>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без роли</SelectItem>
                    {rolesQuery.data?.map((role) => (
                      <SelectItem key={role.slug} value={role.slug}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
