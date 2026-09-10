import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type {
  CommProfile,
  CanProfile,
  UartProfile,
  LinProfile,
  ProtocolType,
} from "../types/Profile";

type ProfilesState = {
  profiles: CommProfile[];
  selectedId: string | null;

  select: (id: string | null) => void;
  add: (protocol?: ProtocolType) => string;        // 🔹 AHORA REGRESA EL ID
  update: (id: string, updates: Partial<CommProfile>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;

  exportToFile: (id: string) => void;
  exportAllToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
  importMultipleFromFile: (file: File) => Promise<void>;

  loadFromStorage: () => void;
  saveToStorage: () => void;
};

let saveTimeout: NodeJS.Timeout | null = null;

export const useProfilesStore = create<ProfilesState>((set, get) => ({
  profiles: [],
  selectedId: null,

  select: (id) => set({ selectedId: id }),

  // ──────────────────────────────────────────────
  // NEW PROFILE  → ahora regresa el ID
  // ──────────────────────────────────────────────
  add: (protocol = "CAN") => {
    const id = uuid();
    const timestamp = new Date().toISOString();

    let newProfile: CommProfile;

    if (protocol === "UART") {
      newProfile = {
        id,
        name: "UART_Profile",
        schema: "pmc.uart.profile/1",
        protocol: "UART",
        revision: 1,
        timestamp,
        uart: {
          baudrate: 115200,
          databits: 8,
          parity: "none",
          stopbits: 1,
        },
        defaults: { timeout_ms: 1000 },
      } as UartProfile;
    } else if (protocol === "LIN") {
      newProfile = {
        id,
        name: "LIN_Profile",
        schema: "pmc.lin.profile/1",
        protocol: "LIN",
        revision: 1,
        timestamp,
        lin: {
          baudrate: 19200,
          master: true,
          frame_id: "0x10",
        },
        defaults: { timeout_ms: 1000 },
      } as LinProfile;
    } else {
      newProfile = {
        id,
        name: "CAN_Profile",
        schema: "pmc.can.profile/1",
        protocol: "CAN",
        revision: 1,
        timestamp,
        can: {
          bitrate: 250000,
          tx_id: "0x18FF0E63",
          rx_id: "0x18FFD0B1",
          extended: true,
        },
        defaults: { timeout_ms: 1000 },
      } as CanProfile;
    }

    set((s) => ({
      profiles: [...s.profiles, newProfile],
      selectedId: newProfile.id,
    }));

    get().saveToStorage();
    return newProfile.id;         // 🔹 IMPORTANTE
  },

  // ──────────────────────────────────────────────
  // UPDATE PROFILE (safe, no loops)
  // ──────────────────────────────────────────────
  update: (id, updates) => {
    set((s) => {
      const existing = s.profiles.find((p) => p.id === id);
      if (!existing) return s;

      const next = { ...existing, ...updates };

      const same = JSON.stringify(existing) === JSON.stringify(next);
      if (same) return s;

      next.timestamp = new Date().toISOString();

      return {
        profiles: s.profiles.map((p) =>
          p.id === id ? (next as CommProfile) : p
        ),
      };
    });

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => get().saveToStorage(), 700);
  },

  // ──────────────────────────────────────────────
  // REMOVE PROFILE  → desasocia recetas
  // ──────────────────────────────────────────────
  remove: (id) => {
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    get().saveToStorage();

    // 🔹 Desasociar este perfil de cualquier receta que lo use
    try {
      // require dinámico para evitar imports circulares
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const recipesStore = require("./useRecipeStore");
      const recipesState = recipesStore.useRecipesStore?.getState?.();
      if (recipesState?.recipes && recipesState.update) {
        recipesState.recipes.forEach((r: any) => {
          if (r.profile_id === id) {
            recipesState.update(r.id, { profile_id: undefined });
          }
        });
      }
    } catch (e) {
      console.warn("No se pudo sincronizar recetas al eliminar perfil:", e);
    }
  },

  // ──────────────────────────────────────────────
  // DUPLICATE PROFILE
  // ──────────────────────────────────────────────
  duplicate: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;

    const copy = {
      ...profile,
      id: uuid(),
      name: `${profile.name}_COPY`,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      profiles: [...s.profiles, copy as CommProfile],
      selectedId: copy.id,
    }));

    get().saveToStorage();
  },

  // ──────────────────────────────────────────────
  // EXPORT
  // ──────────────────────────────────────────────
  exportToFile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;

    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportAllToFile: () => {
    const { profiles } = get();
    if (!profiles.length) return alert("No hay perfiles para exportar.");

    const blob = new Blob([JSON.stringify(profiles, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profiles_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ──────────────────────────────────────────────
  // IMPORT (UNA)
  // ──────────────────────────────────────────────
  importFromFile: async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = Array.isArray(parsed) ? parsed : [parsed];

    const valid = imported
      .filter((p) => typeof p === "object" && p.schema?.startsWith("pmc."))
      .map((p) => ({ ...p, id: uuid() } as CommProfile));

    if (!valid.length) {
      alert("❌ No se encontraron perfiles válidos.");
      return;
    }

    set((s) => ({
      profiles: [...s.profiles, ...valid],
      selectedId: valid[0].id,
    }));

    get().saveToStorage();
  },

  // ──────────────────────────────────────────────
  // IMPORT (MÚLTIPLE)
  // ──────────────────────────────────────────────
  importMultipleFromFile: async (file: File) => {
    const text = await file.text();
    let parsed: any[] = [];

    try {
      parsed = JSON.parse(text);
    } catch {
      alert("❌ JSON inválido.");
      return;
    }

    if (!Array.isArray(parsed)) {
      alert("❌ Se esperaba una lista de perfiles.");
      return;
    }

    const valid = parsed
      .filter((p) => typeof p === "object" && p.schema?.startsWith("pmc."))
      .map((p) => ({ ...p, id: uuid() } as CommProfile));

    if (!valid.length) {
      alert("❌ No se encontraron perfiles válidos.");
      return;
    }

    const existing = get().profiles;
    const merged = [
      ...existing,
      ...valid.filter(
        (p) =>
          !existing.some(
            (e) => e.name === p.name && e.protocol === p.protocol
          )
      ),
    ];

    set({
      profiles: merged,
      selectedId: valid[0].id,
    });

    get().saveToStorage();
  },

  // ──────────────────────────────────────────────
  // LOCAL STORAGE
  // ──────────────────────────────────────────────
  loadFromStorage: () => {
    const raw = localStorage.getItem("profiles_v1");
    if (raw) {
      set({ profiles: JSON.parse(raw) });
    }
  },

  saveToStorage: () => {
    const { profiles } = get();
    localStorage.setItem("profiles_v1", JSON.stringify(profiles));
  },
}));
