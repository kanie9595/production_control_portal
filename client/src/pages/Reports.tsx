import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, FileText, Loader2, Plus, Trash2, Download, BarChart3,
  X, Eye, Link2, AlertTriangle, Scale, Settings2, Check, Edit2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const MANAGER_ROLES = ["production_manager", "production_director"];

export default function Reports() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsProduct, setAnalyticsProduct] = useState("");
  const [confirmDeleteReport, setConfirmDeleteReport] = useState<number | null>(null);
  const [showCustomFieldsManager, setShowCustomFieldsManager] = useState(false);

  // Create form
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shiftNumber, setShiftNumber] = useState(1);
  const [notes, setNotes] = useState("");

  const isManager = user?.role === "admin" || MANAGER_ROLES.includes((user as any)?.productionRole ?? "");

  const utils = trpc.useUtils();
  const reportsQuery = trpc.reports.list.useQuery(undefined, { enabled: isAuthenticated });
  const reportDetail = trpc.reports.get.useQuery({ id: selectedReport! }, { enabled: !!selectedReport });
  const lookupsQuery = trpc.lookups.all.useQuery(undefined, { enabled: isAuthenticated });
  const machinesQuery = trpc.machines.list.useQuery(undefined, { enabled: isAuthenticated });
  const customFieldsQuery = trpc.customFields.list.useQuery(undefined, { enabled: isAuthenticated });
  const analyticsQuery = trpc.reports.analytics.useQuery(
    { moldProduct: analyticsProduct },
    { enabled: showAnalytics && !!analyticsProduct }
  );

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: (data) => {
      toast.success("Отчёт создан");
      setShowCreate(false);
      setSelectedReport(data.id);
      utils.reports.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const addRowMutation = trpc.reports.addRow.useMutation({
    onSuccess: () => {
      toast.success("Строка добавлена");
      utils.reports.get.invalidate();
      utils.orders.list.invalidate();
      utils.orders.forMachine.invalidate();
      utils.orders.activeOrdersForMachine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteRowMutation = trpc.reports.deleteRow.useMutation({
    onSuccess: () => {
      toast.success("Строка удалена");
      utils.reports.get.invalidate();
      utils.orders.list.invalidate();
      utils.orders.forMachine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteReportMutation = trpc.reports.delete.useMutation({
    onSuccess: () => {
      toast.success("Отчёт удалён");
      setSelectedReport(null);
      setConfirmDeleteReport(null);
      utils.reports.list.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Custom fields CRUD
  const createFieldMutation = trpc.customFields.create.useMutation({
    onSuccess: () => { utils.customFields.list.invalidate(); toast.success("Графа добавлена"); },
    onError: (err) => toast.error(err.message),
  });
  const updateFieldMutation = trpc.customFields.update.useMutation({
    onSuccess: () => { utils.customFields.list.invalidate(); toast.success("Графа обновлена"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteFieldMutation = trpc.customFields.delete.useMutation({
    onSuccess: () => { utils.customFields.list.invalidate(); toast.success("Графа удалена"); },
    onError: (err) => toast.error(err.message),
  });

  // Lookup helpers
  const lookupsByCategory = useMemo(() => {
    const map = new Map<string, Array<{ id: number; value: string; parentProduct?: string | null; standardWeight?: string | null }>>();
    for (const l of lookupsQuery.data ?? []) {
      if (!(l as any).isActive) continue;
      const arr = map.get(l.category) ?? [];
      arr.push(l as any);
      map.set(l.category, arr);
    }
    return map;
  }, [lookupsQuery.data]);

  const getOptions = (cat: string) => lookupsByCategory.get(cat) ?? [];

  // Get unique products from molds (parentProduct field)
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    for (const m of getOptions("molds")) {
      if (m.parentProduct) products.add(m.parentProduct);
    }
    return Array.from(products).sort();
  }, [lookupsQuery.data]);

  // Active custom fields
  const activeCustomFields = useMemo(() => {
    return (customFieldsQuery.data ?? []).filter((f: any) => f.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  }, [customFieldsQuery.data]);

  // New row state
  const [newRow, setNewRow] = useState({
    machineNumber: "", moldProduct: "", productColor: "", planQty: 0, actualQty: 0,
    standardCycle: "", actualCycle: "", standardWeight: "", avgWeight: "",
    downtimeMin: 0, downtimeReason: "", defectKg: "0", changeover: 0,
    orderId: undefined as number | undefined,
    customFields: {} as Record<number, string>,
  });

  // Find machineId from machine number for order linking
  const selectedMachineForRow = useMemo(() => {
    if (!newRow.machineNumber) return null;
    return (machinesQuery.data ?? []).find(m => m.number === newRow.machineNumber) ?? null;
  }, [newRow.machineNumber, machinesQuery.data]);

  // Fetch active orders for the selected machine
  const activeOrdersQuery = trpc.orders.activeOrdersForMachine.useQuery(
    { machineId: selectedMachineForRow?.id ?? 0 },
    { enabled: !!selectedMachineForRow }
  );

  // Reset orderId when machine changes
  useEffect(() => {
    setNewRow(prev => ({ ...prev, orderId: undefined, planQty: 0, standardWeight: "", moldProduct: "", productColor: "" }));
  }, [newRow.machineNumber]);

  // Get molds filtered by selected product (from order)
  const filteredMolds = useMemo(() => {
    if (!newRow.orderId) return getOptions("molds");
    const order = (activeOrdersQuery.data ?? []).find((o: any) => o.id === newRow.orderId);
    if (!order) return getOptions("molds");
    const productMolds = getOptions("molds").filter(m => m.parentProduct === order.product);
    return productMolds.length > 0 ? productMolds : getOptions("molds");
  }, [newRow.orderId, activeOrdersQuery.data, lookupsQuery.data]);

  // Auto-fill standardWeight when mold is selected
  useEffect(() => {
    if (!newRow.moldProduct) return;
    const mold = getOptions("molds").find(m => m.value === newRow.moldProduct);
    if (mold && (mold as any).standardWeight) {
      setNewRow(prev => ({ ...prev, standardWeight: (mold as any).standardWeight }));
    }
  }, [newRow.moldProduct, lookupsQuery.data]);

  // Auto-fill product/color/plan from selected order
  const handleOrderSelect = (orderIdStr: string) => {
    const orderId = orderIdStr ? parseInt(orderIdStr) : undefined;
    if (!orderId) {
      setNewRow(prev => ({ ...prev, orderId: undefined, planQty: 0 }));
      return;
    }
    const order = (activeOrdersQuery.data ?? []).find((o: any) => o.id === orderId);
    if (order) {
      const remaining = Math.max(0, (order.quantity ?? 0) - (order.completedQty ?? 0));
      const productMolds = getOptions("molds").filter(m => m.parentProduct === order.product);
      const selectedMold = productMolds.length === 1 ? productMolds[0] : null;
      setNewRow(prev => ({
        ...prev,
        orderId,
        moldProduct: selectedMold ? selectedMold.value : (order.moldName ?? prev.moldProduct),
        productColor: order.color ?? prev.productColor,
        planQty: remaining,
        standardWeight: selectedMold && (selectedMold as any).standardWeight ? (selectedMold as any).standardWeight : prev.standardWeight,
      }));
    } else {
      setNewRow(prev => ({ ...prev, orderId }));
    }
  };

  const handleAddRow = () => {
    if (!selectedReport || !newRow.machineNumber) { toast.error("Выберите станок"); return; }
    const customFieldsArr = Object.entries(newRow.customFields)
      .filter(([, v]) => v !== "")
      .map(([fieldId, value]) => ({ fieldId: parseInt(fieldId), value: value || null }));

    addRowMutation.mutate({
      reportId: selectedReport,
      orderId: newRow.orderId,
      machineNumber: newRow.machineNumber,
      moldProduct: newRow.moldProduct,
      productColor: newRow.productColor,
      planQty: newRow.planQty,
      actualQty: newRow.actualQty,
      standardCycle: newRow.standardCycle,
      actualCycle: newRow.actualCycle,
      standardWeight: newRow.standardWeight || undefined,
      avgWeight: newRow.avgWeight || undefined,
      downtimeMin: newRow.downtimeMin,
      downtimeReason: newRow.downtimeReason || undefined,
      defectKg: newRow.defectKg,
      changeover: newRow.changeover,
      customFields: customFieldsArr.length > 0 ? customFieldsArr : undefined,
    });
    setNewRow({
      machineNumber: "", moldProduct: "", productColor: "", planQty: 0, actualQty: 0,
      standardCycle: "", actualCycle: "", standardWeight: "", avgWeight: "",
      downtimeMin: 0, downtimeReason: "", defectKg: "0", changeover: 0,
      orderId: undefined, customFields: {},
    });
  };

  const handleExportPdf = () => {
    const report = reportDetail.data?.report;
    const rows = reportDetail.data?.rows ?? [];
    if (!report) return;
    const html = `<html><head><meta charset="utf-8"><title>Отчёт за смену</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}
    h1{font-size:16px}table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10px}
    th{background:#f0f0f0;font-weight:bold}</style></head>
    <body><h1>Сменный отчёт</h1>
    <p>Дата: ${report.shiftDate} | Смена: ${report.shiftNumber} | ${(report as any).userName ?? ""}</p>
    ${report.notes ? `<p>Примечания: ${report.notes}</p>` : ""}
    <table><tr><th>Станок</th><th>Пресс-форма</th><th>Цвет</th><th>План (кор.)</th><th>Факт (кор.)</th><th>Ст.вес (г)</th><th>Ср.вес (г)</th><th>Ст.цикл</th><th>Ф.цикл</th><th>Простой</th><th>Причина</th><th>Брак</th><th>Переналадка</th></tr>
    ${rows.map((r: any) => `<tr><td>${r.machineNumber}</td><td>${r.moldProduct}</td><td>${r.productColor}</td><td>${r.planQty}</td><td>${r.actualQty}</td><td>${r.standardWeight ?? "—"}</td><td>${r.avgWeight ?? "—"}</td><td>${r.standardCycle}</td><td>${r.actualCycle}</td><td>${r.downtimeMin} мин</td><td>${r.downtimeReason ?? ""}</td><td>${r.defectKg} кг</td><td>${r.changeover} мин</td></tr>`).join("")}
    </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // Unique products for analytics dropdown
  const analyticsProducts = useMemo(() => {
    const products = new Set<string>();
    for (const l of getOptions("molds")) products.add(l.value);
    return Array.from(products);
  }, [lookupsQuery.data]);

  // Custom fields manager state
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "decimal" | "boolean">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldRequired, setEditFieldRequired] = useState(false);

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
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { if (selectedReport) { setSelectedReport(null); } else { setLocation("/"); } }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <FileText className="w-5 h-5" style={{ color: "oklch(0.65 0.18 200)" }} />
            <h1 className="font-mono text-sm font-semibold text-foreground">
              {selectedReport ? "Детали отчёта" : "Сменные отчёты"}
            </h1>
          </div>
          <div className="flex gap-2">
            {selectedReport && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2 font-mono text-xs">
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                {isManager && (
                  <Button variant="outline" size="sm" onClick={() => setConfirmDeleteReport(selectedReport)}
                    className="gap-2 font-mono text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </Button>
                )}
              </>
            )}
            {!selectedReport && (
              <>
                {isManager && (
                  <Button variant="outline" size="sm" onClick={() => setShowCustomFieldsManager(!showCustomFieldsManager)} className="gap-2 font-mono text-xs">
                    <Settings2 className="w-3.5 h-3.5" /> Графы
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowAnalytics(!showAnalytics)} className="gap-2 font-mono text-xs">
                  <BarChart3 className="w-3.5 h-3.5" /> Аналитика
                </Button>
                <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-2 font-mono text-xs">
                  <Plus className="w-3.5 h-3.5" /> Новый отчёт
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Delete report confirmation modal */}
      {confirmDeleteReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-border p-6 max-w-sm w-full mx-4 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.65 0.25 25 / 0.15)" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "oklch(0.65 0.25 25)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Удалить отчёт?</p>
                <p className="text-xs text-muted-foreground">Все строки будут удалены, данные по заказам скорректированы</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteReport(null)} className="font-mono text-xs">
                Отмена
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteReportMutation.mutate({ id: confirmDeleteReport })}
                disabled={deleteReportMutation.isPending} className="font-mono text-xs">
                {deleteReportMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Custom fields manager */}
        {showCustomFieldsManager && !selectedReport && isManager && (
          <div className="rounded-xl border border-border p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="font-mono text-xs font-semibold text-foreground">Настраиваемые графы отчёта</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCustomFieldsManager(false)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Добавляйте дополнительные графы в отчёт. Они будут отображаться при добавлении строки и в таблице.
            </p>

            {/* Existing fields */}
            <div className="space-y-1">
              {(customFieldsQuery.data ?? []).map((f: any) => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(0.2 0.012 260)" }}>
                  {editingFieldId === f.id ? (
                    <>
                      <input value={editFieldLabel} onChange={(e) => setEditFieldLabel(e.target.value)}
                        className="flex-1 bg-transparent border border-primary/30 rounded px-2 py-1 text-xs text-foreground outline-none" />
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <input type="checkbox" checked={editFieldRequired} onChange={(e) => setEditFieldRequired(e.target.checked)} />
                        Обяз.
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => {
                        updateFieldMutation.mutate({ id: f.id, label: editFieldLabel, isRequired: editFieldRequired });
                        setEditingFieldId(null);
                      }}><Check className="w-3.5 h-3.5 text-green-500" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingFieldId(null)}><X className="w-3.5 h-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-xs ${f.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                        {f.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">{f.fieldType}</span>
                      {f.isRequired && <span className="text-[9px] text-yellow-500">обяз.</span>}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                        setEditingFieldId(f.id); setEditFieldLabel(f.label); setEditFieldRequired(f.isRequired);
                      }}><Edit2 className="w-3 h-3 text-muted-foreground" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                        updateFieldMutation.mutate({ id: f.id, isActive: !f.isActive });
                      }}>{f.isActive ? <X className="w-3 h-3 text-muted-foreground" /> : <Check className="w-3 h-3 text-green-500" />}</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                        if (confirm("Удалить графу?")) deleteFieldMutation.mutate({ id: f.id });
                      }}><Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new field */}
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-primary/20" style={{ background: "oklch(0.2 0.015 260)" }}>
              <div className="flex-1 min-w-[120px]">
                <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Название (системное)</label>
                <input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value.replace(/\s/g, "_").toLowerCase())}
                  placeholder="например: batch_number"
                  className="w-full bg-transparent border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Отображаемое имя</label>
                <input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="например: Номер партии"
                  className="w-full bg-transparent border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none" />
              </div>
              <div className="w-24">
                <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Тип</label>
                <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                  style={{ background: "oklch(0.22 0.012 260)" }}>
                  <option value="text">Текст</option>
                  <option value="number">Число</option>
                  <option value="decimal">Десятичное</option>
                  <option value="boolean">Да/Нет</option>
                </select>
              </div>
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground pb-1">
                <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                Обяз.
              </label>
              <Button size="sm" onClick={() => {
                if (!newFieldName.trim() || !newFieldLabel.trim()) { toast.error("Заполните название и имя"); return; }
                createFieldMutation.mutate({
                  name: newFieldName.trim(),
                  label: newFieldLabel.trim(),
                  fieldType: newFieldType,
                  isRequired: newFieldRequired,
                  sortOrder: (customFieldsQuery.data ?? []).length,
                });
                setNewFieldName(""); setNewFieldLabel(""); setNewFieldType("text"); setNewFieldRequired(false);
              }} disabled={createFieldMutation.isPending} className="font-mono text-xs">
                <Plus className="w-3 h-3 mr-1" /> Добавить
              </Button>
            </div>
          </div>
        )}

        {/* Analytics panel */}
        {showAnalytics && !selectedReport && (
          <div className="rounded-xl border border-border p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">Аналитика по продукту</span>
              <Button variant="ghost" size="icon" onClick={() => setShowAnalytics(false)}><X className="w-4 h-4" /></Button>
            </div>
            <select value={analyticsProduct} onChange={(e) => setAnalyticsProduct(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
              style={{ background: "oklch(0.22 0.012 260)" }}>
              <option value="">Выберите продукт...</option>
              {analyticsProducts.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {analyticsQuery.data && (analyticsQuery.data as any[]).length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(() => {
                    const rows = analyticsQuery.data as any[];
                    const avgCycle = rows.reduce((s, r) => s + parseFloat(r.actualCycle || "0"), 0) / rows.length;
                    const totalDowntime = rows.reduce((s, r) => s + (r.downtimeMin || 0), 0);
                    const totalDefect = rows.reduce((s, r) => s + parseFloat(r.defectKg || "0"), 0);
                    const totalActual = rows.reduce((s, r) => s + (r.actualQty || 0), 0);
                    return [
                      { label: "Ср. цикл", value: `${avgCycle.toFixed(1)}с`, color: "oklch(0.65 0.18 200)" },
                      { label: "Простой", value: `${totalDowntime} мин`, color: "oklch(0.65 0.25 25)" },
                      { label: "Брак", value: `${totalDefect.toFixed(1)} кг`, color: "oklch(0.65 0.2 50)" },
                      { label: "Выпуск", value: `${totalActual} кор.`, color: "oklch(0.7 0.18 145)" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3 border border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                        <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                        <p className="text-lg font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create form */}
        {showCreate && !selectedReport && (
          <div className="rounded-xl border border-primary/30 p-5 space-y-4" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">Новый сменный отчёт</span>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Дата смены</label>
                <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Номер смены</label>
                <select value={shiftNumber} onChange={(e) => setShiftNumber(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground font-mono"
                  style={{ background: "oklch(0.22 0.012 260)" }}>
                  <option value={1}>Смена 1 (дневная)</option>
                  <option value={2}>Смена 2 (ночная)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Примечания</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  style={{ background: "oklch(0.22 0.012 260)" }} />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate({ shiftDate, shiftNumber, notes: notes || undefined })}
              disabled={createMutation.isPending} className="font-mono text-xs">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Создать отчёт
            </Button>
          </div>
        )}

        {/* Report detail view */}
        {selectedReport && (
          <div className="space-y-4">
            {reportDetail.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : reportDetail.data?.report ? (
              <>
                <div className="rounded-xl border border-border p-4" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Отчёт: {reportDetail.data.report.shiftDate} — Смена {reportDetail.data.report.shiftNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{(reportDetail.data.report as any).userName}</span>
                  </div>
                  {reportDetail.data.report.notes && (
                    <p className="text-xs text-muted-foreground">{reportDetail.data.report.notes}</p>
                  )}
                </div>

                {/* Existing rows */}
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">Строки отчёта ({reportDetail.data.rows.length})</span>
                  </div>
                  {reportDetail.data.rows.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Добавьте строки отчёта ниже</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border" style={{ background: "oklch(0.16 0.01 260)" }}>
                            <th className="text-left py-2 px-2 text-muted-foreground font-mono">Станок</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-mono">Пресс-форма</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-mono">Цвет</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">План</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Факт</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ст.вес</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ср.вес</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ст.цикл</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ф.цикл</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Простой</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-mono">Причина</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Брак</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Перенал.</th>
                            <th className="text-center py-2 px-2 text-muted-foreground font-mono">Заказ</th>
                            <th className="py-2 px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportDetail.data.rows.map((row: any) => {
                            const weightDeviation = row.standardWeight && row.avgWeight
                              ? Math.abs(parseFloat(row.avgWeight) - parseFloat(row.standardWeight)) / parseFloat(row.standardWeight) * 100
                              : 0;
                            return (
                              <tr key={row.id} className="border-b border-border/50 hover:bg-white/5">
                                <td className="py-1.5 px-2 text-foreground">{row.machineNumber}</td>
                                <td className="py-1.5 px-2 text-foreground">{row.moldProduct}</td>
                                <td className="py-1.5 px-2 text-foreground">{row.productColor}</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.planQty}</td>
                                <td className="py-1.5 px-2 text-right text-foreground font-semibold">{row.actualQty}</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.standardWeight ? `${row.standardWeight}г` : "—"}</td>
                                <td className="py-1.5 px-2 text-right font-semibold" style={{
                                  color: weightDeviation > 5 ? "oklch(0.65 0.25 25)" : weightDeviation > 2 ? "oklch(0.65 0.2 50)" : "oklch(0.7 0.18 145)"
                                }}>{row.avgWeight ? `${row.avgWeight}г` : "—"}</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.standardCycle}с</td>
                                <td className="py-1.5 px-2 text-right font-semibold" style={{
                                  color: parseFloat(row.actualCycle) > parseFloat(row.standardCycle) * 1.1 ? "oklch(0.65 0.25 25)" : "oklch(0.7 0.18 145)"
                                }}>{row.actualCycle}с</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.downtimeMin} мин</td>
                                <td className="py-1.5 px-2 text-foreground">{row.downtimeReason ?? "—"}</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.defectKg} кг</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.changeover} мин</td>
                                <td className="py-1.5 px-2 text-center">
                                  {row.orderId ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded"
                                      style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "oklch(0.65 0.18 200)" }}>
                                      <Link2 className="w-2.5 h-2.5" /> #{row.orderId}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRowMutation.mutate({ id: row.id })}>
                                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add new row */}
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "oklch(0.18 0.012 260)" }}>
                  <span className="font-mono text-xs font-semibold text-foreground">Добавить строку</span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Станок</label>
                      <select value={newRow.machineNumber} onChange={(e) => setNewRow({ ...newRow, machineNumber: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {getOptions("machines").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>

                    {/* Order selector */}
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">
                        <span className="flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> Заказ</span>
                      </label>
                      <select
                        value={newRow.orderId ?? ""}
                        onChange={(e) => handleOrderSelect(e.target.value)}
                        disabled={!selectedMachineForRow}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">Без заказа</option>
                        {(activeOrdersQuery.data ?? []).map((o: any) => (
                          <option key={o.id} value={o.id}>
                            #{o.id} {o.product} ({o.completedQty ?? 0}/{o.quantity} кор.)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Пресс-форма</label>
                      <select value={newRow.moldProduct} onChange={(e) => setNewRow({ ...newRow, moldProduct: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {filteredMolds.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                      {newRow.orderId && filteredMolds.length > 1 && (
                        <p className="text-[8px] mt-0.5" style={{ color: "oklch(0.65 0.2 50)" }}>
                          {filteredMolds.length} пресс-формы для этой продукции
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Цвет</label>
                      <select value={newRow.productColor} onChange={(e) => setNewRow({ ...newRow, productColor: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {getOptions("colors").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">
                        План (кор.)
                        {newRow.orderId && <span className="ml-1" style={{ color: "oklch(0.7 0.18 145)" }}>✓ авто</span>}
                      </label>
                      <input type="number" value={newRow.planQty || ""} onChange={(e) => setNewRow({ ...newRow, planQty: parseInt(e.target.value) || 0 })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Факт (кор.)</label>
                      <input type="number" value={newRow.actualQty || ""} onChange={(e) => setNewRow({ ...newRow, actualQty: parseInt(e.target.value) || 0 })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block flex items-center gap-1">
                        <Scale className="w-2.5 h-2.5" /> Ст.вес (г)
                        {newRow.standardWeight && <span style={{ color: "oklch(0.7 0.18 145)" }}>✓</span>}
                      </label>
                      <input value={newRow.standardWeight} onChange={(e) => setNewRow({ ...newRow, standardWeight: e.target.value })}
                        placeholder="Из справочника"
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block flex items-center gap-1">
                        <Scale className="w-2.5 h-2.5" /> Ср.вес (г)
                      </label>
                      <input value={newRow.avgWeight} onChange={(e) => setNewRow({ ...newRow, avgWeight: e.target.value })}
                        placeholder="Фактический"
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Ст.цикл (с)</label>
                      <input value={newRow.standardCycle} onChange={(e) => setNewRow({ ...newRow, standardCycle: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Ф.цикл (с)</label>
                      <input value={newRow.actualCycle} onChange={(e) => setNewRow({ ...newRow, actualCycle: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Простой (мин)</label>
                      <input type="number" value={newRow.downtimeMin || ""} onChange={(e) => setNewRow({ ...newRow, downtimeMin: parseInt(e.target.value) || 0 })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Причина</label>
                      <select value={newRow.downtimeReason} onChange={(e) => setNewRow({ ...newRow, downtimeReason: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {getOptions("downtime_reasons").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Брак (кг)</label>
                      <input value={newRow.defectKg} onChange={(e) => setNewRow({ ...newRow, defectKg: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Переналадка (мин)</label>
                      <input type="number" value={newRow.changeover || ""} onChange={(e) => setNewRow({ ...newRow, changeover: parseInt(e.target.value) || 0 })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>

                    {/* Custom fields */}
                    {activeCustomFields.map((f: any) => (
                      <div key={f.id}>
                        <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">
                          {f.label} {f.isRequired && <span className="text-yellow-500">*</span>}
                        </label>
                        {f.fieldType === "boolean" ? (
                          <select
                            value={newRow.customFields[f.id] ?? ""}
                            onChange={(e) => setNewRow({ ...newRow, customFields: { ...newRow.customFields, [f.id]: e.target.value } })}
                            className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }}>
                            <option value="">—</option>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        ) : (
                          <input
                            type={f.fieldType === "number" || f.fieldType === "decimal" ? "number" : "text"}
                            step={f.fieldType === "decimal" ? "0.01" : undefined}
                            value={newRow.customFields[f.id] ?? ""}
                            onChange={(e) => setNewRow({ ...newRow, customFields: { ...newRow.customFields, [f.id]: e.target.value } })}
                            className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                            style={{ background: "oklch(0.22 0.012 260)" }} />
                        )}
                      </div>
                    ))}

                    <div className="flex items-end">
                      <Button onClick={handleAddRow} disabled={addRowMutation.isPending} size="sm" className="font-mono text-xs w-full gap-1">
                        <Plus className="w-3 h-3" /> Добавить
                      </Button>
                    </div>
                  </div>

                  {/* Order link info */}
                  {newRow.orderId && (
                    <div className="flex items-center gap-2 p-2 rounded-lg text-[10px] font-mono"
                      style={{ background: "oklch(0.65 0.18 200 / 0.08)", color: "oklch(0.65 0.18 200)" }}>
                      <Link2 className="w-3 h-3" />
                      Привязано к заказу #{newRow.orderId}. План заполнен автоматически (остаток по заказу). Факт будет зачтён в заказ.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Отчёт не найден</div>
            )}
          </div>
        )}

        {/* Reports list */}
        {!selectedReport && (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="p-4 border-b border-border">
              <span className="font-mono text-xs font-semibold text-foreground">Все отчёты</span>
            </div>
            {reportsQuery.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (reportsQuery.data ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Нет отчётов. Создайте первый отчёт.</div>
            ) : (
              <div className="divide-y divide-border">
                {(reportsQuery.data ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 hover:bg-white/5 transition-colors">
                    <button onClick={() => setSelectedReport(r.id)}
                      className="flex-1 px-4 py-3 flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.65 0.18 200 / 0.12)" }}>
                        <FileText className="w-5 h-5" style={{ color: "oklch(0.65 0.18 200)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.shiftDate} — Смена {r.shiftNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{(r as any).userName ?? "Сотрудник"}</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {isManager && (
                      <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteReport(r.id); }}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
