import { create } from "zustand";

type SignalPoint = { t: number; v: number };

type SignalsState = {
  availableSignals: string[];
  selectedSignals: string[];
  data: Record<string, SignalPoint[]>;
  running: boolean;

  toggleSignal: (sig: string) => void;
  start: () => void;
  pause: () => void;
  clear: () => void;
  addValue: (signal: string, value: number) => void;
  setAvailableSignals: (signals: string | any[]) => void;
};

export const useSignalsStore = create<SignalsState>((set, get) => ({
  availableSignals: [],  
  selectedSignals: [],
  data: {},
  running: false,

  setAvailableSignals: (signals: string | any[]) =>
    set({
      availableSignals: Array.isArray(signals) ? signals : [signals],
      selectedSignals: (Array.isArray(signals) ? signals : [signals]).slice(0, 1) // opcional: seleccionar la primera automáticamente
    }),

  toggleSignal: (sig: string) => {
    const { selectedSignals } = get();
    if (selectedSignals.includes(sig)) {
      set({ selectedSignals: selectedSignals.filter(s => s !== sig) });
    } else {
      set({ selectedSignals: [...selectedSignals, sig] });
    }
  },

  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  clear: () => set({ data: {} }),

  addValue: (signal, value) => {
    const { data, running } = get();
    if (!running) return;

    if (!data[signal]) data[signal] = [];

    data[signal].push({ t: Date.now(), v: value });

    if (data[signal].length > 2000) data[signal].shift();

    set({ data: { ...data } });
  },
}));
