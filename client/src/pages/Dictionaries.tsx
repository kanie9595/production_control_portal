import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Factory,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
  Cpu,
  Palette,
  Wrench,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const MANAGER_ROLES = ["production_manager", "production_director"];

type Category = {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
};

const CATEGORIES: Category[] = [
  { key: "machines", label: "Станки", icon: <Cpu className="w-5 h-5" />, color: "oklch(0.7 0.15 170)", description: "Список станков ТПА" },
  { key: "molds", label: "Пресс-формы", icon: <BookOpen className="w-5 h-5" />, color: "oklch(0.65 0.18 200)", description: "Пресс-формы и продукция" },
  { key: "colors", label: "Цвета", icon: <Palette className="w-5 h-5" />, color: "oklch(0.72 0.19 60)", description: "Цвета изделий" },
  { key: "downtime_reasons", label: "Причины простоя", icon: <AlertTriangle className="w-5 h-5" />, color: "oklch(0.6 0.22 25)", description: "Причины простоя оборудования" },
];

export default function Dictionaries() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("machines");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = user?.role === "admin";
  const isManager = useMemo(
    () => MANAGER_ROLES.includes(user?.productionRole ?? ""),
    [user?.productionRole]
  );
  const canEdit = isAdmin || isManager;

  const lookupsQuery = trpc.lookups.all.useQuery();
  const createMutation = trpc.lookups.create.useMutation({
    onSuccess: () => {
      lookupsQuery.refetch();
      setNewValue("");
      setShowAddForm(false);
      toast.success("Элемент добавлен");
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  });
  const updateMutation = trpc.lookups.update.useMutation({
    onSuccess: () => {
      lookupsQuery.refetch();
      setEditingId(null);
      toast.success("Элемент обновлён");
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  });
  const deleteMutation = trpc.lookups.delete.useMutation({
    onSuccess: () => {
      lookupsQuery.refetch();
      toast.success("Элемент удалён");
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  });
  const bulkCreateMutation = trpc.lookupsBulk.createBulk.useMutation({
    onSuccess: () => {
      lookupsQuery.refetch();
      toast.success("Станки добавлены");
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  });

  const currentItems = useMemo(() => {
    if (!lookupsQuery.data) return [];
    return lookupsQuery.data.filter((item) => item.category === activeCategory);
  }, [lookupsQuery.data, activeCategory]);

  const currentCategory = CATEGORIES.find((c) => c.key === activeCategory)!;

  const handleAdd = () => {
    if (!newValue.trim()) return;
    createMutation.mutate({
      category: activeCategory,
      value: newValue.trim(),
      sortOrder: currentItems.length,
    });
  };

  const handleStartEdit = (id: number, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const handleSaveEdit = (id: number) => {
    if (!editValue.trim()) return;
    updateMutation.mutate({ id, value: editValue.trim() });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить этот элемент?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate({ id, isActive: !currentActive });
  };

  const handleBulkAddMachines = () => {
    const existingMachines = currentItems.map((i) => i.value);
    const newMachines: Array<{ category: string; value: string; sortOrder: number }> = [];
    for (let i = 1; i <= 27; i++) {
      const name = `ТПА-${String(i).padStart(2, "0")}`;
      if (!existingMachines.includes(name)) {
        newMachines.push({ category: "machines", value: name, sortOrder: i - 1 });
      }
    }
    if (newMachines.length === 0) {
      toast.info("Все 27 станков уже добавлены");
      return;
    }
    bulkCreateMutation.mutate({ items: newMachines });
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
        <p className="text-muted-foreground">Пожалуйста, войдите в систему</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.78 0.16 75 / 0.15)" }}>
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-primary">Справочники</p>
              <p className="text-[10px] text-muted-foreground">Управление списками выбора</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {CATEGORIES.map((cat) => {
            const count = lookupsQuery.data?.filter((i) => i.category === cat.key).length ?? 0;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "border-primary/50 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/30"
                }`}
                style={{
                  background: isActive ? "oklch(0.22 0.02 260)" : "oklch(0.18 0.012 260)",
                }}
              >
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{count} элементов</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category content */}
        <div className="rounded-xl border border-border p-6" style={{ background: "oklch(0.18 0.012 260)" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span style={{ color: currentCategory.color }}>{currentCategory.icon}</span>
              <div>
                <h2 className="font-mono text-lg font-semibold text-foreground">{currentCategory.label}</h2>
                <p className="text-xs text-muted-foreground">{currentCategory.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeCategory === "machines" && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAddMachines}
                  disabled={bulkCreateMutation.isPending}
                  className="text-xs"
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Добавить ТПА 1-27
                </Button>
              )}
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Добавить
                </Button>
              )}
            </div>
          </div>

          {/* Add form */}
          {showAddForm && canEdit && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-primary/30" style={{ background: "oklch(0.2 0.015 260)" }}>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Введите название..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                autoFocus
              />
              <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending || !newValue.trim()}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewValue(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Items list */}
          {lookupsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Список пуст</p>
              <p className="text-muted-foreground text-xs mt-1">Добавьте элементы с помощью кнопки выше</p>
            </div>
          ) : (
            <div className="space-y-1">
              {currentItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    !item.isActive ? "opacity-50" : ""
                  }`}
                  style={{ background: idx % 2 === 0 ? "oklch(0.2 0.012 260)" : "transparent" }}
                >
                  <span className="text-xs text-muted-foreground font-mono w-8">{idx + 1}.</span>

                  {editingId === item.id ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-transparent border border-primary/30 rounded px-2 py-1 text-sm text-foreground outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item.id)} disabled={updateMutation.isPending}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${item.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                        {item.value}
                      </span>
                      {!item.isActive && (
                        <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                          Неактивен
                        </span>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(item.id, item.isActive)}
                            className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                            title={item.isActive ? "Деактивировать" : "Активировать"}
                          >
                            {item.isActive ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(item.id, item.value)}
                            className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                            className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </>
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
