import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

export default function TemplateEditor() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [addingToTemplate, setAddingToTemplate] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemSection, setNewItemSection] = useState("");

  const isAdmin = user?.role === "admin";

  const rolesQuery = trpc.roles.list.useQuery();
  const templatesQuery = trpc.templates.list.useQuery();

  const updateItemMutation = trpc.templates.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Пункт обновлён");
      setEditingItem(null);
      setEditText("");
    },
  });

  const deleteItemMutation = trpc.templates.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Пункт удалён");
    },
  });

  const addItemMutation = trpc.templates.addItem.useMutation({
    onSuccess: () => {
      toast.success("Пункт добавлен");
      setAddingToTemplate(null);
      setNewItemText("");
      setNewItemSection("");
    },
  });

  // Group templates by role
  const roleTemplates = useMemo(() => {
    if (!rolesQuery.data || !templatesQuery.data) return [];
    return rolesQuery.data.map((role) => ({
      role,
      templates: templatesQuery.data.filter((t) => t.roleId === role.id),
    }));
  }, [rolesQuery.data, templatesQuery.data]);

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

  const periodLabels: Record<string, string> = {
    daily: "Ежедневный",
    weekly: "Еженедельный",
    monthly: "Ежемесячный",
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40" style={{ background: "oklch(0.14 0.01 260)" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold text-foreground">Шаблоны чек-листов</p>
            <p className="text-[10px] text-muted-foreground">Редактирование пунктов для всех должностей</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {roleTemplates.map(({ role, templates }) => (
          <div key={role.id} className="rounded-xl border border-border overflow-hidden" style={{ background: "oklch(0.18 0.012 260)" }}>
            <div className="p-4 border-b border-border">
              <h2 className="font-mono text-sm font-bold text-foreground">{role.name}</h2>
              <p className="text-[10px] text-muted-foreground">{role.description}</p>
            </div>

            {templates.map((template) => (
              <TemplateSection
                key={template.id}
                template={template}
                periodLabel={periodLabels[template.periodType] ?? template.periodType}
                isExpanded={expandedTemplate === template.id}
                onToggle={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                editingItem={editingItem}
                editText={editText}
                onStartEdit={(id, text) => { setEditingItem(id); setEditText(text); }}
                onCancelEdit={() => { setEditingItem(null); setEditText(""); }}
                onSaveEdit={(id) => updateItemMutation.mutate({ id, text: editText })}
                onDelete={(id) => deleteItemMutation.mutate({ id })}
                onEditTextChange={setEditText}
                addingToTemplate={addingToTemplate}
                onStartAdd={(templateId) => { setAddingToTemplate(templateId); setNewItemText(""); setNewItemSection(""); }}
                onCancelAdd={() => setAddingToTemplate(null)}
                onSaveAdd={(templateId, sectionTitle) => {
                  addItemMutation.mutate({
                    templateId,
                    sectionTitle: sectionTitle || newItemSection,
                    text: newItemText,
                    sortOrder: 999,
                  });
                }}
                newItemText={newItemText}
                newItemSection={newItemSection}
                onNewItemTextChange={setNewItemText}
                onNewItemSectionChange={setNewItemSection}
              />
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}

function TemplateSection({
  template,
  periodLabel,
  isExpanded,
  onToggle,
  editingItem,
  editText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditTextChange,
  addingToTemplate,
  onStartAdd,
  onCancelAdd,
  onSaveAdd,
  newItemText,
  newItemSection,
  onNewItemTextChange,
  onNewItemSectionChange,
}: {
  template: { id: number; periodType: string; title: string };
  periodLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  editingItem: number | null;
  editText: string;
  onStartEdit: (id: number, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onEditTextChange: (text: string) => void;
  addingToTemplate: number | null;
  onStartAdd: (templateId: number) => void;
  onCancelAdd: () => void;
  onSaveAdd: (templateId: number, sectionTitle: string) => void;
  newItemText: string;
  newItemSection: string;
  onNewItemTextChange: (text: string) => void;
  onNewItemSectionChange: (text: string) => void;
}) {
  const itemsQuery = trpc.templates.items.useQuery(
    { templateId: template.id },
    { enabled: isExpanded }
  );

  // Group items by section
  const sections = useMemo(() => {
    if (!itemsQuery.data) return [];
    const map = new Map<string, typeof itemsQuery.data>();
    for (const item of itemsQuery.data) {
      if (!map.has(item.sectionTitle)) map.set(item.sectionTitle, []);
      map.get(item.sectionTitle)!.push(item);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [itemsQuery.data]);

  const sectionTitles = sections.map((s) => s.title);

  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 px-4 hover:bg-white/5 transition-colors">
        <div className="flex-1 text-left">
          <span className="text-xs font-mono text-primary">{periodLabel}</span>
          <span className="text-xs text-muted-foreground ml-2">{template.title}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {itemsQuery.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-border p-3" style={{ background: "oklch(0.16 0.01 260)" }}>
              <p className="text-xs font-mono font-semibold text-foreground mb-2">{section.title}</p>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 group">
                    {editingItem === item.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editText}
                          onChange={(e) => onEditTextChange(e.target.value)}
                          className="text-xs h-8"
                          style={{ background: "oklch(0.18 0.012 260)" }}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-green-500" onClick={() => onSaveEdit(item.id)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onCancelEdit}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-xs text-foreground">{item.text}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onStartEdit(item.id, item.text)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add new item */}
          {addingToTemplate === template.id ? (
            <div className="rounded-lg border border-primary/30 p-3 space-y-2" style={{ background: "oklch(0.16 0.01 260)" }}>
              <p className="text-xs font-mono font-semibold text-primary">Новый пункт</p>
              {sectionTitles.length > 0 && (
                <select
                  value={newItemSection}
                  onChange={(e) => onNewItemSectionChange(e.target.value)}
                  className="w-full text-xs h-8 rounded-md border border-border px-2"
                  style={{ background: "oklch(0.18 0.012 260)", color: "oklch(0.9 0.005 260)" }}
                >
                  <option value="">Выберите секцию или введите новую</option>
                  {sectionTitles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              <Input
                value={newItemSection}
                onChange={(e) => onNewItemSectionChange(e.target.value)}
                placeholder="Название секции"
                className="text-xs h-8"
                style={{ background: "oklch(0.18 0.012 260)" }}
              />
              <Input
                value={newItemText}
                onChange={(e) => onNewItemTextChange(e.target.value)}
                placeholder="Текст пункта чек-листа"
                className="text-xs h-8"
                style={{ background: "oklch(0.18 0.012 260)" }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="text-xs font-mono"
                  disabled={!newItemText.trim() || !newItemSection.trim()}
                  onClick={() => onSaveAdd(template.id, newItemSection)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Добавить
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={onCancelAdd}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-mono w-full"
              onClick={() => onStartAdd(template.id)}
            >
              <Plus className="w-3 h-3 mr-1" /> Добавить пункт
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
