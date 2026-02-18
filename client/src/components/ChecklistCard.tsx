import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sunrise,
  Sun,
  Sunset,
  BarChart3,
  Users,
  Target,
  Settings,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistSection } from "@/lib/checklistData";

const iconMap: Record<string, React.ElementType> = {
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
  "bar-chart": BarChart3,
  users: Users,
  target: Target,
  settings: Settings,
};

interface ChecklistCardProps {
  section: ChecklistSection;
  isChecked: (id: string) => boolean;
  getNote: (id: string) => string;
  onToggle: (id: string) => void;
  onSetNote: (id: string, note: string) => void;
  progress: { completed: number; total: number; percent: number };
}

export default function ChecklistCard({
  section,
  isChecked,
  getNote,
  onToggle,
  onSetNote,
  progress,
}: ChecklistCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const Icon = iconMap[section.icon] || Target;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border overflow-hidden"
      style={{ background: "oklch(0.18 0.012 260)" }}
    >
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}
        >
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-mono text-sm font-semibold text-foreground">
            {section.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {progress.completed} из {progress.total} выполнено
          </p>
        </div>

        {/* Mini progress */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.012 260)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  progress.percent === 100
                    ? "oklch(0.7 0.18 145)"
                    : "oklch(0.78 0.16 75)",
              }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground w-8 text-right">
            {progress.percent}%
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-0.5">
              {section.items.map((item, index) => {
                const checked = isChecked(item.id);
                const note = getNote(item.id);
                const showNote = activeNote === item.id;

                return (
                  <div key={item.id}>
                    <div
                      className={cn(
                        "flex items-start gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 group",
                        checked
                          ? "bg-transparent"
                          : "hover:bg-accent/30"
                      )}
                    >
                      {/* Custom checkbox */}
                      <button
                        onClick={() => onToggle(item.id)}
                        className={cn(
                          "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                          checked
                            ? "border-transparent"
                            : "border-muted-foreground/40 hover:border-primary"
                        )}
                        style={
                          checked
                            ? { background: "oklch(0.7 0.18 145)" }
                            : {}
                        }
                      >
                        {checked && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              bounce: 0.5,
                              duration: 0.4,
                            }}
                            className="w-3 h-3"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="oklch(0.16 0.01 260)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </motion.svg>
                        )}
                      </button>

                      {/* Task number */}
                      <span className="font-mono text-xs text-muted-foreground mt-0.5 w-5 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Task text */}
                      <span
                        className={cn(
                          "text-sm leading-relaxed flex-1 transition-all duration-200",
                          checked
                            ? "line-through text-muted-foreground/50"
                            : "text-foreground"
                        )}
                      >
                        {item.text}
                      </span>

                      {/* Note button */}
                      <button
                        onClick={() =>
                          setActiveNote(showNote ? null : item.id)
                        }
                        className={cn(
                          "mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                          (showNote || note) && "opacity-100"
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            "w-4 h-4",
                            note
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        />
                      </button>
                    </div>

                    {/* Note input */}
                    <AnimatePresence>
                      {showNote && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-14 pr-3 pb-2">
                            <textarea
                              value={note}
                              onChange={(e) =>
                                onSetNote(item.id, e.target.value)
                              }
                              placeholder="Добавить примечание..."
                              className="w-full text-xs bg-input border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                              rows={2}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
