import { create } from "zustand";

export type ToastType = "success" | "info" | "warn" | "error";

interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  timestamp: string;
}

interface ToastStore {
  toasts: ToastMessage[];
  history: ToastMessage[];
  push: (text: string, type?: ToastType) => void;
  remove: (id: string) => void;
  clearHistory: () => void;
  loadHistory: () => void;
}

const STORAGE_KEY = "pmc-hmi-eventlog";

export const useToastStore = create<ToastStore>((set,get) => ({
  toasts: [],
  history: [],
  push: (text, type = "info") => {
    const id = Math.random().toString(36).substring(2);
     const msg: ToastMessage = {
      id,
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    // 🔹 Agrega a toasts activos
    set((s) => ({ toasts: [...s.toasts, msg] }));

    // 🔹 Guarda en historial (máx 100)
    const updated = [msg, ...get().history].slice(0, 100);
    set({ history: updated });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
        const audioMap: Record<ToastType, string> = {
            success: "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAwAABHVhdGEAAABDbGljayBtZWRpYSBiZWVwAABYbWQAAAAsAAAAAgAAAgsAAABDbGljayBtZWRpYSBiZWVwAAAA",
            info: "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAwAABHVhdGEAAABJbmZvIG5vdGlmAABYbWQAAAAsAAAAAgAAAgsAAABJbmZvIG5vdGlmAAAA",
            warn: "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAwAABHVhdGEAAABCZWFwIG1lZGlhAABYbWQAAAAsAAAAAgAAAgsAAABCZWFwIG1lZGlhAAAA",
            error: "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAwAABHVhdGEAAABFcnJvciB0b25lAABYbWQAAAAsAAAAAgAAAgsAAABFcnJvciB0b25lAAAA",
        };
        const src = audioMap[type];
        if (src) {
            const a = new Audio(src);
            a.volume = 0.2;
            a.play().catch(() => {});
        }
    } catch {}
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ history: [] });
  },

  // 🔹 Cargar historial almacenado
  loadHistory: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) set({ history: JSON.parse(saved) });
    } catch {
      console.warn("⚠️ No se pudo leer historial localStorage");
    }
  }

}));
