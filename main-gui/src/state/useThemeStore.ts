import { create } from "zustand";

type Theme = "light" | "dark";

export const useThemeStore = create<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}>(set => ({
  theme: (localStorage.getItem("theme") as Theme) || "dark",

  toggle: () =>
    set(state => {
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);

      // ⬅ APLICAR CLASE A <html>
      document.documentElement.classList.toggle("dark", next === "dark");

      return { theme: next };
    }),

  setTheme: (t) => {
    localStorage.setItem("theme", t);

    // ⬅ APLICAR CLASE A <html>
    document.documentElement.classList.toggle("dark", t === "dark");

    set({ theme: t });
  }
}));
