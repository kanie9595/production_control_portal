import { useState, useEffect, useCallback, useMemo } from "react";

interface ChecklistState {
  [dateKey: string]: {
    [itemId: string]: {
      checked: boolean;
      note: string;
      timestamp: number;
    };
  };
}

const STORAGE_KEY = "production-control-checklist";

function getDateKey(tabId: string): string {
  const now = new Date();
  if (tabId === "daily") {
    return `${tabId}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (tabId === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${tabId}-${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }
  // monthly
  return `${tabId}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function loadState(): ChecklistState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveState(state: ChecklistState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail
  }
}

export function useChecklist(tabId: string) {
  const [state, setState] = useState<ChecklistState>(loadState);
  const dateKey = useMemo(() => getDateKey(tabId), [tabId]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setState((prev) => {
        const dateItems = prev[dateKey] || {};
        const current = dateItems[itemId] || { checked: false, note: "", timestamp: 0 };
        return {
          ...prev,
          [dateKey]: {
            ...dateItems,
            [itemId]: {
              ...current,
              checked: !current.checked,
              timestamp: Date.now(),
            },
          },
        };
      });
    },
    [dateKey]
  );

  const setNote = useCallback(
    (itemId: string, note: string) => {
      setState((prev) => {
        const dateItems = prev[dateKey] || {};
        const current = dateItems[itemId] || { checked: false, note: "", timestamp: 0 };
        return {
          ...prev,
          [dateKey]: {
            ...dateItems,
            [itemId]: {
              ...current,
              note,
            },
          },
        };
      });
    },
    [dateKey]
  );

  const isChecked = useCallback(
    (itemId: string): boolean => {
      return state[dateKey]?.[itemId]?.checked ?? false;
    },
    [state, dateKey]
  );

  const getNote = useCallback(
    (itemId: string): string => {
      return state[dateKey]?.[itemId]?.note ?? "";
    },
    [state, dateKey]
  );

  const getProgress = useCallback(
    (itemIds: string[]): { completed: number; total: number; percent: number } => {
      const total = itemIds.length;
      const completed = itemIds.filter((id) => state[dateKey]?.[id]?.checked).length;
      return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },
    [state, dateKey]
  );

  const resetAll = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev };
      delete newState[dateKey];
      return newState;
    });
  }, [dateKey]);

  return {
    toggleItem,
    setNote,
    isChecked,
    getNote,
    getProgress,
    resetAll,
    dateKey,
  };
}
