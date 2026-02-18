import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sunrise,
  Sun,
  Sunset,
  BarChart3,
  Target,
  Settings,
  Clipboard,
  Users,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";

const iconMap: Record<string, React.ReactNode> = {
  sunrise: <Sunrise className="w-4 h-4" />,
  sun: <Sun className="w-4 h-4" />,
  sunset: <Sunset className="w-4 h-4" />,
  "bar-chart": <BarChart3 className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  clipboard: <Clipboard className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
};

function buildDateKey(periodType: string): string {
  const now = new Date();
  if (periodType === "daily") {
    return `daily-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (periodType === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `weekly-${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }
  return `monthly-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateLabel(periodType: string): string {
  const now = new Date();
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  if (periodType === "daily") return `${weekdays[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  if (periodType === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `Неделя ${weekNumber}, ${now.getFullYear()}`;
  }
  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

export default function EmployeeChecklist() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [activePeriod, setActivePeriod] = useState("daily");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [noteEditing, setNoteEditing] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  // Get roles
  const rolesQuery = trpc.roles.list.useQuery();
  // Get templates for user's role
  const userRole = useMemo(() => {
    if (!user?.productionRole || !rolesQuery.data) return null;
    return rolesQuery.data.find((r) => r.slug === user.productionRole) ?? null;
  }, [user?.productionRole, rolesQuery.data]);

  const templatesQuery = trpc.templates.listForRole.useQuery(
    { roleId: userRole?.id ?? 0 },
    { enabled: !!userRole }
  );

  const currentTemplate = useMemo(() => {
    if (!templatesQuery.data) return null;
    return templatesQuery.data.find((t) => t.periodType === activePeriod) ?? null;
  }, [templatesQuery.data, activePeriod]);

  const dateKey = useMemo(() => buildDateKey(activePeriod), [activePeriod]);

  // Get or create instance
  const instanceMutation = trpc.instances.getOrCreate.useMutation();
  const [instanceId, setInstanceId] = useState<number | null>(null);

  useEffect(() => {
    if (currentTemplate) {
      instanceMutation.mutate(
        { templateId: currentTemplate.id, dateKey },
        { onSuccess: (data) => { if (data) setInstanceId(data.id); } }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTemplate?.id, dateKey]);

  // Get template items for display
  const templateItemsQuery = trpc.templates.items.useQuery(
    { templateId: currentTemplate?.id ?? 0 },
    { enabled: !!currentTemplate }
  );

  // Get instance items
  const instanceItemsQuery = trpc.instances.items.useQuery(
    { instanceId: instanceId ?? 0 },
    { enabled: !!instanceId }
  );

  const toggleMutation = trpc.instances.toggleItem.useMutation({
    onSuccess: () => instanceItemsQuery.refetch(),
  });
  const noteMutation = trpc.instances.setNote.useMutation({
    onSuccess: () => instanceItemsQuery.refetch(),
  });

  // Group items by section
  const sections = useMemo(() => {
    if (!templateItemsQuery.data || !instanceItemsQuery.data) return [];
    const sectionMap = new Map<string, { title: string; icon: string; items: Array<{ templateItem: typeof templateItemsQuery.data[0]; instanceItem: typeof instanceItemsQuery.data[0] | undefined }> }>();
    for (const ti of templateItemsQuery.data) {
      if (!sectionMap.has(ti.sectionTitle)) {
        sectionMap.set(ti.sectionTitle, { title: ti.sectionTitle, icon: ti.sectionIcon, items: [] });
      }
      const ii = instanceItemsQuery.data.find((i) => i.templateItemId === ti.id);
      sectionMap.get(ti.sectionTitle)!.items.push({ templateItem: ti, instanceItem: ii });
    }
    return Array.from(sectionMap.values());
  }, [templateItemsQuery.data, instanceItemsQuery.data]);

  // Progress
  const progress = useMemo(() => {
    if (!instanceItemsQuery.data) return { total: 0, completed: 0, percent: 0 };
    const total = instanceItemsQuery.data.length;
    const completed = instanceItemsQuery.data.filter((i) => i.checked).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [instanceItemsQuery.data]);

  const toggleSection = useCallback((title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const handleToggle = useCallback((itemId: number, checked: boolean) => {
    toggleMutation.mutate({ itemId, checked: !checked });
  }, [toggleMutation]);

  const handleSaveNote = useCallback((itemId: number) => {
    noteMutation.mutate({ itemId, note: noteText });
    setNoteEditing(null);
    setNoteText("");
  }, [noteMutation, noteText]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.16 0.01 260)" }}>
        <div className="max-w-md mx-4 text-center">
          <div className="rounded-2xl border border-border p-8" style={{ background: "oklch(0.18 0.012 260)" }}>
            <Clipboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-mono text-lg font-bold text-foreground mb-2">Роль не назначена</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Обратитесь к начальнику производства для назначения вашей должности в системе.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" /> На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const availablePeriods = templatesQuery.data?.map((t) => t.periodType) ?? [];

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground truncate">{userRole.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatDateLabel(activePeriod)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono font-bold text-primary">{progress.percent}%</p>
            <p className="text-[10px] text-muted-foreground">{progress.completed}/{progress.total}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Period tabs */}
        {availablePeriods.length > 1 && (
          <Tabs value={activePeriod} onValueChange={setActivePeriod} className="mb-6">
            <TabsList className="w-full" style={{ background: "oklch(0.2 0.012 260)" }}>
              {availablePeriods.includes("daily") && <TabsTrigger value="daily" className="flex-1 font-mono text-xs">День</TabsTrigger>}
              {availablePeriods.includes("weekly") && <TabsTrigger value="weekly" className="flex-1 font-mono text-xs">Неделя</TabsTrigger>}
              {availablePeriods.includes("monthly") && <TabsTrigger value="monthly" className="flex-1 font-mono text-xs">Месяц</TabsTrigger>}
            </TabsList>
          </Tabs>
        )}

        {/* Progress bar */}
        <div className="rounded-xl border border-border p-4 mb-6" style={{ background: "oklch(0.18 0.012 260)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-mono">Прогресс</span>
            <span className="text-xs font-mono font-bold" style={{ color: progress.percent === 100 ? "oklch(0.7 0.18 145)" : "oklch(0.78 0.16 75)" }}>
              {progress.percent}%
            </span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>

        {/* Sections */}
        {sections.map((section) => {
          const isExpanded = expandedSections[section.title] !== false; // default expanded
          const sectionCompleted = section.items.filter((i) => i.instanceItem?.checked).length;
          const sectionTotal = section.items.length;
          return (
            <div key={section.title} className="rounded-xl border border-border mb-4 overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}>
                  {iconMap[section.icon] ?? <Clipboard className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-mono text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="text-[10px] text-muted-foreground">{sectionCompleted}/{sectionTotal} выполнено</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {section.items.map(({ templateItem, instanceItem }) => (
                    <div key={templateItem.id} className="border-b border-border last:border-b-0 p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={instanceItem?.checked ?? false}
                          onCheckedChange={() => {
                            if (instanceItem) handleToggle(instanceItem.id, instanceItem.checked);
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${instanceItem?.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {templateItem.text}
                          </p>
                          {instanceItem?.note && noteEditing !== instanceItem.id && (
                            <p className="text-xs text-muted-foreground mt-1 italic">📝 {instanceItem.note}</p>
                          )}
                          {noteEditing === instanceItem?.id ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Добавить примечание..."
                                className="text-xs min-h-[60px]"
                                style={{ background: "oklch(0.16 0.01 260)" }}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" className="text-xs" onClick={() => handleSaveNote(instanceItem!.id)}>
                                  Сохранить
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setNoteEditing(null); setNoteText(""); }}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (instanceItem) {
                                  setNoteEditing(instanceItem.id);
                                  setNoteText(instanceItem.note ?? "");
                                }
                              }}
                              className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {instanceItem?.note ? "Изменить" : "Примечание"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sections.length === 0 && !instanceItemsQuery.isLoading && (
          <div className="text-center py-12">
            <Clipboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет пунктов для этого периода</p>
          </div>
        )}
      </main>
    </div>
  );
}
