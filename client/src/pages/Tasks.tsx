import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, ListTodo, Loader2, Plus, CheckCircle2, Circle, Clock,
  AlertTriangle, User, Calendar, ChevronDown, ChevronUp, MessageSquare, X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const MANAGER_ROLES = ["production_manager", "production_director"];
const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "oklch(0.7 0.18 145 / 0.15)", text: "oklch(0.7 0.18 145)", label: "Низкий" },
  medium: { bg: "oklch(0.78 0.16 75 / 0.15)", text: "oklch(0.78 0.16 75)", label: "Средний" },
  high: { bg: "oklch(0.65 0.25 25 / 0.15)", text: "oklch(0.65 0.25 25)", label: "Высокий" },
  critical: { bg: "oklch(0.55 0.25 15 / 0.15)", text: "oklch(0.55 0.25 15)", label: "Критический" },
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", in_progress: "В работе", completed: "Выполнена", cancelled: "Отменена",
};

export default function Tasks() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";
  const isManager = MANAGER_ROLES.includes(user?.productionRole ?? "");
  const canManage = isAdmin || isManager;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");

  const utils = trpc.useUtils();
  const tasksQuery = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15000 });
  const usersQuery = trpc.users.list.useQuery(undefined, { enabled: canManage && isAuthenticated });
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Задача создана");
      setShowCreate(false);
      setTitle(""); setDescription(""); setAssigneeId(""); setPriority("medium"); setDueDate("");
      utils.tasks.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Статус обновлён");
      utils.tasks.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredTasks = useMemo(() => {
    const data = tasksQuery.data ?? [];
    if (filter === "all") return data;
    return data.filter((t: any) => t.status === filter);
  }, [tasksQuery.data, filter]);

  const handleCreate = () => {
    if (!title.trim() || !assigneeId) { toast.error("Заполните название и исполнителя"); return; }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId: parseInt(assigneeId),
      priority: priority as any,
      deadline: dueDate || undefined,
    });
  };

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
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Войдите в систему</p>
          <Button onClick={() => setLocation("/")}>На главную</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      <header className="border-b border-border sticky top-0 z-10" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <ListTodo className="w-5 h-5" style={{ color: "oklch(0.72 0.19 60)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">
              {canManage ? "Управление задачами" : "Мои задачи"}
            </h1>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-2 font-mono text-xs">
              <Plus className="w-3.5 h-3.5" /> Новая задача
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Create form */}
        {showCreate && canManage && (
          <div className="rounded-xl border border-primary/30 p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">Новая задача</span>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название задачи *"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
              style={{ background: "oklch(0.22 0.012 260)" }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground resize-none"
              style={{ background: "oklch(0.22 0.012 260)" }} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Исполнитель *</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                  style={{ background: "oklch(0.22 0.012 260)" }}>
                  <option value="">Выберите...</option>
                  {(usersQuery.data ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email ?? `User #${u.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Приоритет</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                  style={{ background: "oklch(0.22 0.012 260)" }}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Срок</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="font-mono text-xs">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Создать задачу
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[{ v: "all", l: "Все" }, { v: "pending", l: "Ожидают" }, { v: "in_progress", l: "В работе" }, { v: "completed", l: "Выполнены" }, { v: "cancelled", l: "Отменены" }].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border ${filter === f.v ? "border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              style={{ background: filter === f.v ? "oklch(0.78 0.16 75 / 0.1)" : "oklch(0.18 0.012 260)" }}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Tasks list */}
        {tasksQuery.isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center" style={{ background: "oklch(0.18 0.012 260)" }}>
            <ListTodo className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет задач</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task: any) => {
              const pri = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;
              const isExpanded = expandedTask === task.id;
              return (
                <div key={task.id} className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <button onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "oklch(0.7 0.18 145)" }} />
                    ) : task.status === "in_progress" ? (
                      <Clock className="w-5 h-5 shrink-0" style={{ color: "oklch(0.78 0.16 75)" }} />
                    ) : task.status === "cancelled" ? (
                      <X className="w-5 h-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: pri.bg, color: pri.text }}>{pri.label}</span>
                        {task.assigneeName && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />{task.assigneeName}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{STATUS_LABELS[task.status]}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                      {task.description && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Создана: {new Date(task.createdAt).toLocaleString("ru-RU")}
                        {task.creatorName && ` — ${task.creatorName}`}
                      </div>
                      {/* Status change buttons */}
                      <div className="flex flex-wrap gap-2">
                        {task.status === "pending" && (
                          <Button size="sm" variant="outline" className="text-xs font-mono gap-1"
                            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "in_progress" })}>
                            <Clock className="w-3 h-3" /> Взять в работу
                          </Button>
                        )}
                        {(task.status === "pending" || task.status === "in_progress") && (
                          <Button size="sm" variant="outline" className="text-xs font-mono gap-1"
                            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "completed" })}
                            style={{ borderColor: "oklch(0.7 0.18 145 / 0.3)", color: "oklch(0.7 0.18 145)" }}>
                            <CheckCircle2 className="w-3 h-3" /> Выполнена
                          </Button>
                        )}
                        {canManage && task.status !== "cancelled" && task.status !== "completed" && (
                          <Button size="sm" variant="outline" className="text-xs font-mono gap-1 text-muted-foreground"
                            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "cancelled" })}>
                            <X className="w-3 h-3" /> Отменить
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
