import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { RecipeDoc } from "../types/Recipe";
import { mapExternalRecipe } from "../utils/recipeImportMapper";
import { isInternalRecipe, isExternalRecipe } from "../utils/recipeValidators";


type RecipesState = {
  recipes: RecipeDoc[];
  selectedId: string | null;
  select: (id: string | null) => void;
  add: (base?: Partial<RecipeDoc>) => void;
  update: (id: string, updates: Partial<RecipeDoc>) => void;
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

export const useRecipesStore = create<RecipesState>((set, get) => ({
  recipes: [],
  selectedId: null,

  select: (id) => set({ selectedId: id }),

  add: (base = {}) => {
    const newRecipe: RecipeDoc = {
      id: "1",
      schema: "pmc.recipe/1",
      job_id: "NEW_JOB",
      family: "GENERIC",
      serial: "ACT0000",
      sequence: [],
      timestamp: new Date().toISOString(),
      ...base,
    };
    (newRecipe as any).id = uuid();
    set((s) => ({ recipes: [...s.recipes, newRecipe], selectedId: newRecipe.id }));
    get().saveToStorage();
  },

  update: (id, updates) => {
    set((s) => ({
      recipes: s.recipes.map((r: any) =>
        r.id === id ? { ...r, ...updates, timestamp: new Date().toISOString() } : r
      ),
    }));

    // 🔹 Evita spam de guardados consecutivos
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
      get().saveToStorage();
    }, 800);
  },

  remove: (id) => {
    set((s) => ({ recipes: s.recipes.filter((r: any) => r.id !== id) }));
    get().saveToStorage();
  },

  duplicate: (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;

    const profilesStore = require("./useProfilesStore");
    const profilesState = profilesStore.useProfilesStore?.getState?.();

    let newProfileId: string | null = null;

    // 🔹 Si la receta tiene un perfil asociado, duplícalo
    if (recipe.profile_id && profilesState) {
      const profile = profilesState.profiles.find((p: any) => p.id === recipe.profile_id);
      if (profile) {
        const copyProfile = {
          ...profile,
          id: uuid(),
          name: `${profile.name || "profile"}_COPY`,
          timestamp: new Date().toISOString(),
        };
        profilesState.profiles.push(copyProfile);
        profilesState.saveToStorage();
        newProfileId = copyProfile.id;
      }
    }

    // 🔹 Duplica la receta y vincula el nuevo perfil (si se generó)
    const copy: RecipeDoc = {
      ...recipe,
      id: uuid(),
      job_id: `${recipe.job_id || "JOB"}_COPY`,
      timestamp: new Date().toISOString(),
      profile_id: newProfileId ?? recipe.profile_id ?? undefined,
    };

    set((s) => ({
      recipes: [...s.recipes, copy],
      selectedId: copy.id,
    }));

    get().saveToStorage();

    alert(
      `✅ Receta duplicada como "${copy.job_id}" ${
        newProfileId ? `con perfil "${newProfileId}"` : "(perfil original mantenido)"
      }`
    );
  },

  exportToFile: (id) => {
    const recipe = get().recipes.find((r: any) => r.id === id);
    if (!recipe) return;

    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.job_id || "recipe"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportAllToFile: () => {
    const { recipes } = get();
    if (!recipes.length) return alert("No hay recetas para exportar.");
    const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recipes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importFromFile: async (file: File) => {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("❌ Archivo JSON inválido.");
      return;
    }
    const imported = Array.isArray(parsed) ? parsed : [parsed];
    const mapped = imported
      .map((raw) => {
        if (isInternalRecipe(raw)) return { ...raw, id: uuid() };
        if (isExternalRecipe(raw)) return mapExternalRecipe(raw);
        return null; // no válida
      })
      .filter(Boolean);

    if (mapped.length === 0) {
      alert("❌ El archivo no contiene recetas válidas.");
      return;
    }

    set((s) => ({
      recipes: [...s.recipes, ...mapped],
      selectedId: mapped[0].id,
    }));
    get().saveToStorage();
  },

  importMultipleFromFile: async (file: File) => {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("❌ Archivo JSON inválido");
      return;
    }

    if (!Array.isArray(parsed)) {
      alert("❌ Se esperaba un arreglo de recetas.");
      return;
    }

    const mapped = parsed
      .map((raw) => {
        if (isInternalRecipe(raw)) return { ...raw, id: uuid() };
        if (isExternalRecipe(raw)) return mapExternalRecipe(raw);
        return null;
      })
      .filter(Boolean);

    if (mapped.length === 0) {
      alert("❌ No se encontraron recetas válidas.");
      return;
    }

    // Evita duplicados exactos por job_id + family
    const existing = get().recipes;
    const merged = [
      ...existing,
      ...mapped.filter(
        (r) => !existing.some((e) => e.job_id === r.job_id && e.family === r.family)
      ),
    ];

    set({ recipes: merged, selectedId: mapped[0].id });
    get().saveToStorage();

    alert(`✅ Importadas ${mapped.length} recetas nuevas`);
  },

  loadFromStorage: () => {
    const raw = localStorage.getItem("recipes_v1");
    if (raw) {
      set({ recipes: JSON.parse(raw) });
    }
  },

  saveToStorage: () => {
    const { recipes } = get();
    localStorage.setItem("recipes_v1", JSON.stringify(recipes));
  },
}));
