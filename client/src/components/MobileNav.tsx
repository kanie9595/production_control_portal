import { motion } from "framer-motion";
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "daily", label: "День", icon: CalendarDays },
  { id: "weekly", label: "Неделя", icon: CalendarRange },
  { id: "monthly", label: "Месяц", icon: CalendarClock },
  { id: "tips", label: "Советы", icon: Lightbulb },
];

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border lg:hidden"
      style={{ background: "oklch(0.14 0.01 260 / 0.95)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-active"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
