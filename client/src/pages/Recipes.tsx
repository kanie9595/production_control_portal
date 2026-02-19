import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, Beaker, Loader2, Plus, X, Trash2, Edit, Save, Percent, Weight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Recipes() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<number | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editProduct, setEditProduct] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // New component form
  const [compMaterial, setCompMaterial] = useState("");
  const [compPercent, setCompPercent] = useState("");
  const [compWeight, setCompWeight] = useState("");
  const [compNotes, setCompNotes] = useState("");

  const utils = trpc.useUtils();
  const recipesQuery = trpc.recipes.list.useQuery(undefined, { enabled: isAuthenticated });
  const recipeDetail = trpc.recipes.get.useQuery({ id: selectedRecipe! }, { enabled: !!selectedRecipe });

  const createMutation = trpc.recipes.create.useMutation({
    onSuccess: (data) => {
      toast.success("Рецепт создан");
      setShowCreate(false);
      setSelectedRecipe(data.id);
      setName(""); setProduct(""); setDescription("");
      utils.recipes.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.recipes.update.useMutation({
    onSuccess: () => {
      toast.success("Рецепт обновлён");
      setEditingRecipe(null);
      utils.recipes.list.invalidate();
      utils.recipes.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.recipes.delete.useMutation({
    onSuccess: () => {
      toast.success("Рецепт удалён");
      setSelectedRecipe(null);
      utils.recipes.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addComponentMutation = trpc.recipes.addComponent.useMutation({
    onSuccess: () => {
      toast.success("Компонент добавлен");
      setCompMaterial(""); setCompPercent(""); setCompWeight(""); setCompNotes("");
      utils.recipes.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteComponentMutation = trpc.recipes.deleteComponent.useMutation({
    onSuccess: () => { toast.success("Компонент удалён"); utils.recipes.get.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const handleAddComponent = () => {
    if (!selectedRecipe || !compMaterial.trim() || !compPercent.trim()) {
      toast.error("Укажите материал и процент");
      return;
    }
    addComponentMutation.mutate({
      recipeId: selectedRecipe,
      materialName: compMaterial.trim(),
      percentage: compPercent.trim(),
      weightKg: compWeight.trim() || undefined,
      notes: compNotes.trim() || undefined,
    });
  };

  const startEdit = (recipe: any) => {
    setEditingRecipe(recipe.id);
    setEditName(recipe.name);
    setEditProduct(recipe.product);
    setEditDescription(recipe.description ?? "");
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
        <div className="text-center"><p className="text-muted-foreground mb-4">Войдите в систему</p><Button onClick={() => setLocation("/")}>На главную</Button></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      <header className="border-b border-border sticky top-0 z-10" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { if (selectedRecipe) { setSelectedRecipe(null); } else { setLocation("/"); } }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Beaker className="w-5 h-5" style={{ color: "oklch(0.7 0.15 330)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">
              {selectedRecipe ? "Рецепт сырья" : "Сырьё — Рецепты"}
            </h1>
          </div>
          {!selectedRecipe && (
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-2 font-mono text-xs">
              <Plus className="w-3.5 h-3.5" /> Новый рецепт
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Create form */}
        {showCreate && !selectedRecipe && (
          <div className="rounded-xl border border-primary/30 p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">Новый рецепт</span>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Название рецепта *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ПП прозрачный для стаканов"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Продукция *</label>
                <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Стакан 200мл"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Описание</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Необязательно"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
            </div>
            <Button onClick={() => {
              if (!name.trim() || !product.trim()) { toast.error("Укажите название и продукцию"); return; }
              createMutation.mutate({ name: name.trim(), product: product.trim(), description: description.trim() || undefined });
            }} disabled={createMutation.isPending} className="font-mono text-xs">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Создать рецепт
            </Button>
          </div>
        )}

        {/* Recipe detail */}
        {selectedRecipe && (
          <div className="space-y-4">
            {recipeDetail.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : recipeDetail.data?.recipe ? (
              <>
                {/* Recipe info */}
                <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
                  {editingRecipe === recipeDetail.data.recipe.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase mb-0.5 block">Название</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-border px-2 py-1.5 text-sm text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase mb-0.5 block">Продукция</label>
                          <input value={editProduct} onChange={(e) => setEditProduct(e.target.value)}
                            className="w-full rounded border border-border px-2 py-1.5 text-sm text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase mb-0.5 block">Описание</label>
                          <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full rounded border border-border px-2 py-1.5 text-sm text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMutation.mutate({
                          id: recipeDetail.data!.recipe!.id,
                          name: editName.trim() || undefined,
                          product: editProduct.trim() || undefined,
                          description: editDescription.trim() || null,
                        })} className="font-mono text-xs gap-1">
                          <Save className="w-3 h-3" /> Сохранить
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingRecipe(null)} className="font-mono text-xs">Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-mono text-sm font-bold text-foreground">{recipeDetail.data.recipe.name}</h2>
                        <p className="text-xs text-muted-foreground mt-1">Продукция: {recipeDetail.data.recipe.product}</p>
                        {recipeDetail.data.recipe.description && (
                          <p className="text-xs text-muted-foreground">{recipeDetail.data.recipe.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(recipeDetail.data!.recipe)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                          if (confirm("Удалить рецепт?")) deleteMutation.mutate({ id: recipeDetail.data!.recipe!.id });
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Components table */}
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="p-3 border-b border-border">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Состав рецепта ({recipeDetail.data.components.length} компонентов)
                    </span>
                  </div>
                  {recipeDetail.data.components.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Добавьте компоненты рецепта ниже</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                            <th className="text-left py-2 px-3 text-muted-foreground font-mono">Материал</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-mono">%</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-mono">Вес (кг)</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-mono">Примечания</th>
                            <th className="py-2 px-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipeDetail.data.components.map((comp: any) => (
                            <tr key={comp.id} className="border-b border-border/50 hover:bg-white/5">
                              <td className="py-2 px-3 text-foreground font-medium">{comp.materialName}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold" style={{ color: "oklch(0.7 0.15 330)" }}>
                                {comp.percentage}%
                              </td>
                              <td className="py-2 px-3 text-right text-foreground">{comp.weightKg ? `${comp.weightKg} кг` : "—"}</td>
                              <td className="py-2 px-3 text-muted-foreground">{comp.notes ?? "—"}</td>
                              <td className="py-2 px-3">
                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => deleteComponentMutation.mutate({ id: comp.id })}>
                                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                            <td className="py-2 px-3 font-mono text-xs font-semibold text-foreground">Итого</td>
                            <td className="py-2 px-3 text-right font-mono font-bold" style={{
                              color: (() => {
                                const total = recipeDetail.data!.components.reduce((s: number, c: any) => s + parseFloat(c.percentage || "0"), 0);
                                return Math.abs(total - 100) < 0.1 ? "oklch(0.7 0.18 145)" : "oklch(0.65 0.25 25)";
                              })()
                            }}>
                              {recipeDetail.data.components.reduce((s: number, c: any) => s + parseFloat(c.percentage || "0"), 0).toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">
                              {recipeDetail.data.components.reduce((s: number, c: any) => s + parseFloat(c.weightKg || "0"), 0).toFixed(2)} кг
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add component */}
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <span className="font-mono text-xs font-semibold text-foreground">Добавить компонент</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Материал *</label>
                      <input value={compMaterial} onChange={(e) => setCompMaterial(e.target.value)} placeholder="ПП 01030"
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Процент *</label>
                      <input value={compPercent} onChange={(e) => setCompPercent(e.target.value)} placeholder="85"
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Вес (кг)</label>
                      <input value={compWeight} onChange={(e) => setCompWeight(e.target.value)} placeholder="Необяз."
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Примечания</label>
                      <input value={compNotes} onChange={(e) => setCompNotes(e.target.value)} placeholder="Необяз."
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddComponent} disabled={addComponentMutation.isPending} size="sm" className="font-mono text-xs w-full gap-1">
                        <Plus className="w-3 h-3" /> Добавить
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Рецепт не найден</div>
            )}
          </div>
        )}

        {/* Recipes list */}
        {!selectedRecipe && (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="p-4 border-b border-border">
              <span className="font-mono text-xs font-semibold text-foreground">Все рецепты</span>
            </div>
            {recipesQuery.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (recipesQuery.data ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Нет рецептов. Создайте первый рецепт.</div>
            ) : (
              <div className="divide-y divide-border">
                {(recipesQuery.data ?? []).map((r: any) => (
                  <button key={r.id} onClick={() => setSelectedRecipe(r.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.7 0.15 330 / 0.12)" }}>
                      <Beaker className="w-5 h-5" style={{ color: "oklch(0.7 0.15 330)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">Продукция: {r.product}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
