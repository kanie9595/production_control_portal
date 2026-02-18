import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface StatusBarProps {
  completed: number;
  total: number;
  percent: number;
  periodLabel: string;
  dateLabel: string;
}

export default function StatusBar({
  completed,
  total,
  percent,
  periodLabel,
  dateLabel,
}: StatusBarProps) {
  const remaining = total - completed;

  return (
    <div className="rounded-xl border border-border p-5 relative overflow-hidden"
      style={{ background: "oklch(0.17 0.012 260)" }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.78 0.16 75)" }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Progress circle */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="oklch(0.25 0.012 260)"
                strokeWidth="6"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="oklch(0.78 0.16 75)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 34 - (percent / 100) * 2 * Math.PI * 34,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xl font-bold text-primary">
                {percent}%
              </span>
            </div>
          </div>

          <div>
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">
              {periodLabel}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 lg:ml-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.7 0.18 145 / 0.15)" }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.7 0.18 145)" }} />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{completed}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Выполнено</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.78 0.16 75 / 0.15)" }}
            >
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{remaining}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Осталось</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.65 0.15 250 / 0.15)" }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.65 0.15 250)" }} />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Всего</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.012 260)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, oklch(0.78 0.16 75), oklch(0.7 0.18 145))" }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
