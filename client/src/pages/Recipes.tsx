import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, Beaker, Loader2, Plus, X, Trash2, Edit, Save, Percent,
  Calculator, Package, FileText, Check, AlertTriangle, RefreshCw,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

type Tab = "recipes" | "requests";

export default function Recipes() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("recipes");

  // ===== RECIPES TAB =====
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

  // ===== REQUESTS TAB =====
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [baseWeightInput, setBaseWeightInput] = useState("");

  const utils = trpc.useUtils();
  const recipesQuery = trpc.recipes.list.useQuery(undefined, { enabled: isAuthenticated });
  const recipeDetail = trpc.recipes.get.useQuery({ id: selectedRecipe! }, { enabled: !!selectedRecipe });
  const requestsQuery = trpc.materialRequests.list.useQuery(undefined, { enabled: isAuthenticated && activeTab === "requests" });
  const requestDetail = trpc.materialRequests.get.useQuery({ id: selectedRequest! }, { enabled: !!selectedRequest });

  // Get unique products from molds for product dropdown
  const lookupsQuery = trpc.lookups.all.useQuery(undefined, { enabled: isAuthenticated });
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    for (const l of lookupsQuery.data ?? []) {
      if (l.category === "molds" && (l as any).parentProduct) {
        products.add((l as any).parentProduct);
      }
    }
    return Array.from(products).sort();
  }, [lookupsQuery.data]);

  // Recipe mutations
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

  // Material request mutations
  const updateRequestMutation = trpc.materialRequests.update.useMutation({
    onSuccess: () => { toast.success("Заявка обновлена"); utils.materialRequests.get.invalidate(); utils.materialRequests.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const updateItemMutation = trpc.materialRequests.updateItem.useMutation({
    onSuccess: () => { toast.success("Обновлено"); utils.materialRequests.get.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const addItemMutation = trpc.materialRequests.addItem.useMutation({
    onSuccess: () => { toast.success("Компонент добавлен"); utils.materialRequests.get.invalidate(); setCompMaterial(""); setCompPercent(""); },
    onError: (err) => toast.error(err.message),
  });

  const deleteItemMutation = trpc.materialRequests.deleteItem.useMutation({
    onSuccess: () => { toast.success("Удалено"); utils.materialRequests.get.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const recalcMutation = trpc.materialRequests.recalculate.useMutation({
    onSuccess: () => { toast.success("Пересчитано"); utils.materialRequests.get.invalidate(); setBaseWeightInput(""); },
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
            <Button variant="ghost" size="icon" onClick={() => {
              if (selectedRecipe) { setSelectedRecipe(null); }
              else if (selectedRequest) { setSelectedRequest(null); }
              else { setLocation("/"); }
            }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Beaker className="w-5 h-5" style={{ color: "oklch(0.7 0.15 330)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">Сырьё</h1>
          </div>
          <div className="flex gap-2">
            {activeTab === "recipes" && !selectedRecipe && (
              <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-2 font-mono text-xs">
                <Plus className="w-3.5 h-3.5" /> Новый рецепт
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      {!selectedRecipe && !selectedRequest && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "oklch(0.14 0.01 260)" }}>
            <button onClick={() => setActiveTab("recipes")}
              className={`flex-1 px-4 py-2 rounded-md text-xs font-mono font-semibold transition-colors ${
                activeTab === "recipes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Beaker className="w-3.5 h-3.5 inline mr-1.5" /> Рецепты
            </button>
            <button onClick={() => setActiveTab("requests")}
              className={`flex-1 px-4 py-2 rounded-md text-xs font-mono font-semibold transition-colors ${
                activeTab === "requests" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Package className="w-3.5 h-3.5 inline mr-1.5" /> Заявки на сырьё
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ============ RECIPES TAB ============ */}
        {activeTab === "recipes" && !selectedRequest && (
          <>
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
                    <select value={product} onChange={(e) => setProduct(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      style={{ background: "oklch(0.22 0.012 260)" }}>
                      <option value="">Выберите продукцию...</option>
                      {uniqueProducts.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
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
                              <select value={editProduct} onChange={(e) => setEditProduct(e.target.value)}
                                className="w-full rounded border border-border px-2 py-1.5 text-sm text-foreground"
                                style={{ background: "oklch(0.22 0.012 260)" }}>
                                <option value="">Выберите...</option>
                                {uniqueProducts.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
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
                          <input value={compMaterial} onChange={(e) => setCompMaterial(e.target.value)} placeholder="Hyosung R901"
                            className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }} />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Процент *</label>
                          <input value={compPercent} onChange={(e) => setCompPercent(e.target.value)} placeholder="50"
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
                      <p className="text-[9px] text-muted-foreground">
                        Пример: Hyosung R901 — 50%, Китай K1980 — 50%. Красители добавляются отдельным компонентом (напр. Чёрный — 1%).
                      </p>
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
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Нет рецептов. Создайте первый рецепт — он будет автоматически применяться при создании заказа.
                  </div>
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
          </>
        )}

        {/* ============ REQUESTS TAB ============ */}
        {activeTab === "requests" && !selectedRecipe && (
          <>
            {/* Request detail */}
            {selectedRequest && (
              <MaterialRequestDetail
                requestDetail={requestDetail}
                baseWeightInput={baseWeightInput}
                setBaseWeightInput={setBaseWeightInput}
                recalcMutation={recalcMutation}
                updateItemMutation={updateItemMutation}
                updateRequestMutation={updateRequestMutation}
                addItemMutation={addItemMutation}
                deleteItemMutation={deleteItemMutation}
                compMaterial={compMaterial}
                setCompMaterial={setCompMaterial}
                compPercent={compPercent}
                setCompPercent={setCompPercent}
              />
            )}

            {/* Requests list */}
            {!selectedRequest && (
              <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-foreground">Заявки на сырьё</span>
                  <span className="text-[9px] text-muted-foreground">Создаются автоматически при создании заказа с рецептом</span>
                </div>
                {requestsQuery.isLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (requestsQuery.data ?? []).length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Нет заявок. Заявки создаются автоматически при создании заказа, если для продукции есть рецепт.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(requestsQuery.data ?? []).map((r: any) => (
                      <button key={r.id} onClick={() => setSelectedRequest(r.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                          background: r.status === "completed" ? "oklch(0.7 0.18 145 / 0.12)" :
                            r.status === "in_progress" ? "oklch(0.65 0.18 200 / 0.12)" : "oklch(0.65 0.2 50 / 0.12)"
                        }}>
                          <Package className="w-5 h-5" style={{
                            color: r.status === "completed" ? "oklch(0.7 0.18 145)" :
                              r.status === "in_progress" ? "oklch(0.65 0.18 200)" : "oklch(0.65 0.2 50)"
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{r.product}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Заказ #{r.orderId} | {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                            {r.baseWeightKg && ` | Базовый вес: ${r.baseWeightKg} кг`}
                          </p>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                          r.status === "completed" ? "bg-green-500/10 text-green-400" :
                          r.status === "in_progress" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {r.status === "completed" ? "Выполнена" : r.status === "in_progress" ? "В работе" : "Ожидание"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ===== Material Request Detail Component =====
function MaterialRequestDetail({
  requestDetail, baseWeightInput, setBaseWeightInput, recalcMutation,
  updateItemMutation, updateRequestMutation, addItemMutation, deleteItemMutation,
  compMaterial, setCompMaterial, compPercent, setCompPercent,
}: any) {
  const request = requestDetail.data?.request;
  const items = requestDetail.data?.items ?? [];

  // Local state for inline editing
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editActualKg, setEditActualKg] = useState("");
  const [editBatchNumber, setEditBatchNumber] = useState("");

  if (requestDetail.isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Заявка не найдена</div>;
  }

  const totalPercent = items.reduce((s: number, i: any) => s + parseFloat(i.percentage || "0"), 0);
  const totalCalcKg = items.reduce((s: number, i: any) => s + parseFloat(i.calculatedKg || "0"), 0);
  const totalActualKg = items.reduce((s: number, i: any) => s + parseFloat(i.actualKg || "0"), 0);

  return (
    <div className="space-y-4">
      {/* Request header */}
      <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-mono text-sm font-bold text-foreground">Заявка на сырьё: {request.product}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Заказ #{request.orderId} | Дата: {new Date(request.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {request.notes && <p className="text-xs text-muted-foreground">{request.notes}</p>}
          </div>
          <div className="flex gap-2">
            {["pending", "in_progress", "completed"].map((s) => (
              <button key={s} onClick={() => updateRequestMutation.mutate({ id: request.id, status: s })}
                className={`text-[9px] font-mono px-2 py-1 rounded transition-colors ${
                  request.status === s ? "ring-2 ring-primary" : "opacity-50 hover:opacity-100"
                } ${s === "completed" ? "bg-green-500/10 text-green-400" : s === "in_progress" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                {s === "completed" ? "Выполнена" : s === "in_progress" ? "В работе" : "Ожидание"}
              </button>
            ))}
          </div>
        </div>

        {/* Base weight calculator */}
        <div className="flex items-end gap-2 p-3 rounded-lg border border-primary/20" style={{ background: "oklch(0.2 0.015 260)" }}>
          <div className="flex-1">
            <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block flex items-center gap-1">
              <Calculator className="w-2.5 h-2.5" /> Базовый вес (кг) — введите, чтобы пересчитать все компоненты
            </label>
            <input type="number" step="0.01" value={baseWeightInput || request.baseWeightKg || ""}
              onChange={(e) => setBaseWeightInput(e.target.value)}
              placeholder="Например: 30"
              className="w-full bg-transparent border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none" />
          </div>
          <Button size="sm" onClick={() => {
            const w = baseWeightInput || request.baseWeightKg;
            if (!w) { toast.error("Введите базовый вес"); return; }
            recalcMutation.mutate({ requestId: request.id, baseWeightKg: w });
          }} disabled={recalcMutation.isPending} className="font-mono text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Пересчитать
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Введите общий вес сырья. Каждый компонент будет автоматически пересчитан по его проценту.
          Например: при базовом весе 30 кг, компонент с 50% получит 15 кг.
        </p>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
        <div className="p-3 border-b border-border">
          <span className="font-mono text-xs font-semibold text-foreground">
            Компоненты ({items.length})
          </span>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Нет компонентов</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                  <th className="text-left py-2 px-3 text-muted-foreground font-mono">Материал</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-mono">%</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-mono">Расчёт (кг)</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-mono">Факт (кг)</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-mono">Партия</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-white/5">
                    <td className="py-2 px-3 text-foreground font-medium">{item.materialName}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold" style={{ color: "oklch(0.7 0.15 330)" }}>
                      {item.percentage}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono" style={{ color: "oklch(0.65 0.18 200)" }}>
                      {item.calculatedKg ? `${item.calculatedKg} кг` : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.01" value={editActualKg}
                            onChange={(e) => setEditActualKg(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  actualKg: editActualKg || null,
                                  batchNumber: editBatchNumber || null,
                                });
                                setEditingItemId(null);
                              }
                            }}
                            className="w-16 sm:w-20 bg-transparent border border-primary/30 rounded px-1 py-0.5 text-xs text-foreground text-right outline-none"
                            autoFocus />
                          {/* Mobile confirm button */}
                          <Button variant="ghost" size="icon" className="h-6 w-6 sm:hidden" onClick={() => {
                            updateItemMutation.mutate({
                              id: item.id,
                              actualKg: editActualKg || null,
                              batchNumber: editBatchNumber || null,
                            });
                            setEditingItemId(null);
                          }}>
                            <Check className="w-3 h-3 text-green-500" />
                          </Button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingItemId(item.id); setEditActualKg(item.actualKg ?? ""); setEditBatchNumber(item.batchNumber ?? ""); }}
                          className="text-foreground hover:text-primary cursor-pointer">
                          {item.actualKg ? `${item.actualKg} кг` : <span className="text-muted-foreground italic">ввести</span>}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input value={editBatchNumber}
                            onChange={(e) => setEditBatchNumber(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  actualKg: editActualKg || null,
                                  batchNumber: editBatchNumber || null,
                                });
                                setEditingItemId(null);
                              }
                            }}
                            placeholder="№ партии"
                            className="w-20 sm:w-24 bg-transparent border border-primary/30 rounded px-1 py-0.5 text-xs text-foreground outline-none" />
                        </div>
                      ) : (
                        <button onClick={() => { setEditingItemId(item.id); setEditActualKg(item.actualKg ?? ""); setEditBatchNumber(item.batchNumber ?? ""); }}
                          className="text-foreground hover:text-primary cursor-pointer">
                          {item.batchNumber || <span className="text-muted-foreground italic">ввести</span>}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingItemId === item.id ? (
                        <div className="flex gap-1">
                          {/* Desktop confirm button */}
                          <Button variant="ghost" size="icon" className="h-6 w-6 hidden sm:flex" onClick={() => {
                            updateItemMutation.mutate({
                              id: item.id,
                              actualKg: editActualKg || null,
                              batchNumber: editBatchNumber || null,
                            });
                            setEditingItemId(null);
                          }}>
                            <Check className="w-3 h-3 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingItemId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => deleteItemMutation.mutate({ id: item.id })}>
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                  <td className="py-2 px-3 font-mono text-xs font-semibold text-foreground">Итого</td>
                  <td className="py-2 px-3 text-right font-mono font-bold" style={{
                    color: Math.abs(totalPercent - 100) < 0.1 ? "oklch(0.7 0.18 145)" : "oklch(0.65 0.25 25)"
                  }}>
                    {totalPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: "oklch(0.65 0.18 200)" }}>
                    {totalCalcKg.toFixed(3)} кг
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-foreground">
                    {totalActualKg.toFixed(3)} кг
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add component to request */}
      <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "oklch(0.18 0.012 260)" }}>
        <span className="font-mono text-xs font-semibold text-foreground">Добавить компонент (например краситель)</span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Материал *</label>
            <input value={compMaterial} onChange={(e) => setCompMaterial(e.target.value)} placeholder="Чёрный краситель"
              className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
              style={{ background: "oklch(0.22 0.012 260)" }} />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Процент *</label>
            <input value={compPercent} onChange={(e) => setCompPercent(e.target.value)} placeholder="1"
              className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
              style={{ background: "oklch(0.22 0.012 260)" }} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => {
              if (!compMaterial.trim() || !compPercent.trim()) { toast.error("Укажите материал и процент"); return; }
              const baseKg = parseFloat(request.baseWeightKg || "0");
              const pct = parseFloat(compPercent);
              const calcKg = baseKg > 0 ? ((pct / 100) * baseKg).toFixed(3) : undefined;
              addItemMutation.mutate({
                requestId: request.id,
                materialName: compMaterial.trim(),
                percentage: compPercent.trim(),
                calculatedKg: calcKg,
                sortOrder: items.length,
              });
              setCompMaterial(""); setCompPercent("");
            }} disabled={addItemMutation.isPending} size="sm" className="font-mono text-xs w-full gap-1">
              <Plus className="w-3 h-3" /> Добавить
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border p-4 space-y-2" style={{ background: "oklch(0.18 0.012 260)" }}>
        <label className="text-[9px] text-muted-foreground uppercase block">Примечания к заявке</label>
        <textarea
          defaultValue={request.notes ?? ""}
          onBlur={(e) => {
            if (e.target.value !== (request.notes ?? "")) {
              updateRequestMutation.mutate({ id: request.id, notes: e.target.value || null });
            }
          }}
          rows={2}
          className="w-full bg-transparent border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none resize-none"
          placeholder="Добавить примечания..." />
      </div>
    </div>
  );
}
