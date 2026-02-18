import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import StatusBar from "@/components/StatusBar";
import ChecklistCard from "@/components/ChecklistCard";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import { useChecklist } from "@/hooks/useChecklist";
import { checklistTabs, recommendations } from "@/lib/checklistData";

function formatDateLabel(tabId: string): string {
  const now = new Date();
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const weekdays = [
    "Воскресенье", "Понедельник", "Вторник", "Среда",
    "Четверг", "Пятница", "Суббота",
  ];

  if (tabId === "daily") {
    return `${weekdays[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (tabId === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `Неделя ${weekNumber}, ${now.getFullYear()}`;
  }
  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function getPeriodLabel(tabId: string): string {
  switch (tabId) {
    case "daily": return "Ежедневные задачи";
    case "weekly": return "Еженедельные задачи";
    case "monthly": return "Ежемесячные задачи";
    default: return "";
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("daily");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { toggleItem, setNote, isChecked, getNote, getProgress, resetAll } =
    useChecklist(activeTab);

  const currentTab = useMemo(
    () => checklistTabs.find((t) => t.id === activeTab),
    [activeTab]
  );

  const allItemIds = useMemo(() => {
    if (!currentTab) return [];
    return currentTab.sections.flatMap((s) => s.items.map((i) => i.id));
  }, [currentTab]);

  const totalProgress = useMemo(
    () => getProgress(allItemIds),
    [getProgress, allItemIds]
  );

  const handleReset = () => {
    resetAll();
    toast.success("Чек-лист сброшен", {
      description: "Все отметки и примечания удалены для текущего периода.",
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[220px]"
        } pb-20 lg:pb-0`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <AnimatePresence mode="wait">
            {activeTab === "tips" ? (
              <motion.div
                key="tips"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <RecommendationsPanel recommendations={recommendations} />
              </motion.div>
            ) : currentTab ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Status bar */}
                <StatusBar
                  completed={totalProgress.completed}
                  total={totalProgress.total}
                  percent={totalProgress.percent}
                  periodLabel={getPeriodLabel(activeTab)}
                  dateLabel={formatDateLabel(activeTab)}
                />

                {/* Reset button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Сбросить
                  </button>
                </div>

                {/* Checklist sections */}
                {currentTab.sections.map((section) => {
                  const sectionItemIds = section.items.map((i) => i.id);
                  const sectionProgress = getProgress(sectionItemIds);
                  return (
                    <ChecklistCard
                      key={section.id}
                      section={section}
                      isChecked={isChecked}
                      getNote={getNote}
                      onToggle={toggleItem}
                      onSetNote={setNote}
                      progress={sectionProgress}
                    />
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
