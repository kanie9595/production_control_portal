import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft, FileText, Loader2, Plus, Trash2, Save, Download, BarChart3,
  ChevronDown, ChevronUp, X, Eye,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Reports() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsProduct, setAnalyticsProduct] = useState("");

  // Create form
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shiftNumber, setShiftNumber] = useState(1);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const reportsQuery = trpc.reports.list.useQuery(undefined, { enabled: isAuthenticated });
  const reportDetail = trpc.reports.get.useQuery({ id: selectedReport! }, { enabled: !!selectedReport });
  const lookupsQuery = trpc.lookups.all.useQuery(undefined, { enabled: isAuthenticated });
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
    onSuccess: () => { toast.success("Строка добавлена"); utils.reports.get.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteRowMutation = trpc.reports.deleteRow.useMutation({
    onSuccess: () => { toast.success("Строка удалена"); utils.reports.get.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  // Lookup helpers
  const lookupsByCategory = useMemo(() => {
    const map = new Map<string, Array<{ id: number; value: string }>>();
    for (const l of lookupsQuery.data ?? []) {
      const arr = map.get(l.category) ?? [];
      arr.push(l);
      map.set(l.category, arr);
    }
    return map;
  }, [lookupsQuery.data]);

  const getOptions = (cat: string) => lookupsByCategory.get(cat) ?? [];

  // New row state
  const [newRow, setNewRow] = useState({
    machineNumber: "", moldProduct: "", productColor: "", planQty: 0, actualQty: 0,
    standardCycle: "", actualCycle: "", downtimeMin: 0, downtimeReason: "", defectKg: "0", changeover: 0,
  });

  const handleAddRow = () => {
    if (!selectedReport || !newRow.machineNumber) { toast.error("Выберите станок"); return; }
    addRowMutation.mutate({
      reportId: selectedReport,
      ...newRow,
    });
    setNewRow({ machineNumber: "", moldProduct: "", productColor: "", planQty: 0, actualQty: 0, standardCycle: "", actualCycle: "", downtimeMin: 0, downtimeReason: "", defectKg: "0", changeover: 0 });
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
    <table><tr><th>Станок</th><th>Пресс-форма</th><th>Цвет</th><th>План</th><th>Факт</th><th>Ст.цикл</th><th>Ф.цикл</th><th>Простой</th><th>Причина</th><th>Брак</th><th>Переналадка</th></tr>
    ${rows.map((r: any) => `<tr><td>${r.machineNumber}</td><td>${r.moldProduct}</td><td>${r.productColor}</td><td>${r.planQty}</td><td>${r.actualQty}</td><td>${r.standardCycle}</td><td>${r.actualCycle}</td><td>${r.downtimeMin} мин</td><td>${r.downtimeReason ?? ""}</td><td>${r.defectKg} кг</td><td>${r.changeover} мин</td></tr>`).join("")}
    </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // Unique products for analytics dropdown
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    for (const r of reportsQuery.data ?? []) {
      // We'll use lookup data for products
    }
    for (const l of getOptions("mold_product")) products.add(l.value);
    return Array.from(products);
  }, [reportsQuery.data, lookupsQuery.data]);

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
              <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2 font-mono text-xs">
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
            )}
            {!selectedReport && (
              <>
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
              {uniqueProducts.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {analyticsQuery.data && (analyticsQuery.data as any[]).length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(() => {
                    const data = analyticsQuery.data as any[];
                    const avgCycle = data.reduce((s, d) => s + parseFloat(d.actualCycle || "0"), 0) / data.length;
                    const avgDowntime = data.reduce((s, d) => s + (d.downtimeMin || 0), 0) / data.length;
                    const totalDefect = data.reduce((s, d) => s + parseFloat(d.defectKg || "0"), 0);
                    const avgChangeover = data.reduce((s, d) => s + (d.changeover || 0), 0) / data.length;
                    return (
                      <>
                        <div className="rounded-lg border border-border p-3 text-center" style={{ background: "oklch(0.22 0.012 260)" }}>
                          <p className="font-mono text-lg font-bold text-foreground">{avgCycle.toFixed(1)}с</p>
                          <p className="text-[10px] text-muted-foreground">Ср. цикл</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center" style={{ background: "oklch(0.22 0.012 260)" }}>
                          <p className="font-mono text-lg font-bold text-foreground">{avgDowntime.toFixed(0)} мин</p>
                          <p className="text-[10px] text-muted-foreground">Ср. простой</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center" style={{ background: "oklch(0.22 0.012 260)" }}>
                          <p className="font-mono text-lg font-bold text-foreground">{totalDefect.toFixed(1)} кг</p>
                          <p className="text-[10px] text-muted-foreground">Всего брак</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center" style={{ background: "oklch(0.22 0.012 260)" }}>
                          <p className="font-mono text-lg font-bold text-foreground">{avgChangeover.toFixed(0)} мин</p>
                          <p className="text-[10px] text-muted-foreground">Ср. переналадка</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-mono">Дата</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-mono">Станок</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-mono">Факт.цикл</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-mono">Простой</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-mono">Брак</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-mono">Переналадка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsQuery.data as any[]).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1.5 px-2 text-foreground">{row.shiftDate}</td>
                          <td className="py-1.5 px-2 text-foreground">{row.machineNumber}</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{row.actualCycle}с</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{row.downtimeMin} мин</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{row.defectKg} кг</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{row.changeover} мин</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {analyticsQuery.data && (analyticsQuery.data as any[]).length === 0 && analyticsProduct && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет данных для этого продукта</p>
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
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ст.цикл</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Ф.цикл</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Простой</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-mono">Причина</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Брак</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-mono">Переналадка</th>
                            <th className="py-2 px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportDetail.data.rows.map((row: any) => (
                            <tr key={row.id} className="border-b border-border/50 hover:bg-white/5">
                              <td className="py-1.5 px-2 text-foreground">{row.machineNumber}</td>
                              <td className="py-1.5 px-2 text-foreground">{row.moldProduct}</td>
                              <td className="py-1.5 px-2 text-foreground">{row.productColor}</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.planQty}</td>
                              <td className="py-1.5 px-2 text-right text-foreground font-semibold">{row.actualQty}</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.standardCycle}с</td>
                              <td className="py-1.5 px-2 text-right font-semibold" style={{
                                color: parseFloat(row.actualCycle) > parseFloat(row.standardCycle) * 1.1 ? "oklch(0.65 0.25 25)" : "oklch(0.7 0.18 145)"
                              }}>{row.actualCycle}с</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.downtimeMin} мин</td>
                              <td className="py-1.5 px-2 text-foreground">{row.downtimeReason ?? "—"}</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.defectKg} кг</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.changeover} мин</td>
                              <td className="py-1.5 px-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRowMutation.mutate({ id: row.id })}>
                                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
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
                        {getOptions("machine_number").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Пресс-форма</label>
                      <select value={newRow.moldProduct} onChange={(e) => setNewRow({ ...newRow, moldProduct: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {getOptions("mold_product").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Цвет</label>
                      <select value={newRow.productColor} onChange={(e) => setNewRow({ ...newRow, productColor: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }}>
                        <option value="">—</option>
                        {getOptions("product_color").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">План (шт)</label>
                      <input type="number" value={newRow.planQty || ""} onChange={(e) => setNewRow({ ...newRow, planQty: parseInt(e.target.value) || 0 })}
                        className="w-full rounded border border-border px-2 py-1.5 text-xs text-foreground"
                        style={{ background: "oklch(0.22 0.012 260)" }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase mb-0.5 block">Факт (шт)</label>
                      <input type="number" value={newRow.actualQty || ""} onChange={(e) => setNewRow({ ...newRow, actualQty: parseInt(e.target.value) || 0 })}
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
                        {getOptions("downtime_reason").map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
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
                    <div className="flex items-end">
                      <Button onClick={handleAddRow} disabled={addRowMutation.isPending} size="sm" className="font-mono text-xs w-full gap-1">
                        <Plus className="w-3 h-3" /> Добавить
                      </Button>
                    </div>
                  </div>
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
                  <button key={r.id} onClick={() => setSelectedReport(r.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.65 0.18 200 / 0.12)" }}>
                      <FileText className="w-5 h-5" style={{ color: "oklch(0.65 0.18 200)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.shiftDate} — Смена {r.shiftNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{(r as any).userName ?? "Сотрудник"}</p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
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
