import { create } from "zustand";

export type LogEntry = {
  ts: string;
  topic: string;
  type: "info" | "warn" | "error" | "debug";
  message: string;
  data?: any;
};

type LogState = {
  logs: LogEntry[];
  add: (entry: Omit<LogEntry, "ts">) => void;
  clear: () => void;
  exportJson: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  writeToDisk?: () => void; // solo en Electron
};

// 🗄️ Constantes
const STORAGE_KEY = "pmc_logs_v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// 🔍 Detecta si estamos corriendo dentro de Electron
const isElectron =
  typeof window !== "undefined" && !!(window as any).process?.versions?.electron;

// 🧩 Si estamos en Electron, importamos dinámicamente fs y path
let fs: typeof import("fs") | null = null;
let path: typeof import("path") | null = null;
if (isElectron) {
  fs = require("fs");
  path = require("path");
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],

  add: (entry) => {
    const ts = new Date().toISOString();
    const newLog = { ts, ...entry };

    set((s) => {
      const now = Date.now();
      const next = [newLog, ...s.logs]
        .filter((l) => now - new Date(l.ts).getTime() < MAX_AGE_MS)
        .slice(0, 500);

      // Guarda en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      // Guarda en disco si está en Electron
      if (isElectron) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const logsDir =
            process.platform === "win32"
              ? path!.join("C:\\PMC", "logs")
              : path!.join(process.env.HOME || "/home/pmc", "logs");

          if (!fs!.existsSync(logsDir)) fs!.mkdirSync(logsDir, { recursive: true });

          const logPath = path!.join(logsDir, `${today}.json`);
          fs!.writeFileSync(logPath, JSON.stringify(next, null, 2));
        } catch (err) {
          console.warn("⚠️ Error writing logs to disk:", err);
        }
      }

      return { logs: next };
    });
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ logs: [] });
  },

  exportJson: () => {
    const data = get().logs;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pmc_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const now = Date.now();
      const fresh = parsed.filter(
        (l) => now - new Date(l.ts).getTime() < MAX_AGE_MS
      );

      set({ logs: fresh.slice(0, 500) });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh.slice(0, 500)));
    } catch (err) {
      console.warn("Error loading logs from storage:", err);
    }
  },

  saveToStorage: () => {
    const { logs } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  },
}));
