import { create } from "zustand";

type Role = "operator" | "tech" | "admin";

type User = {
  username: string;
  role: Role;
};

type AuthState = {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

// Usuarios fijos locales
const USERS: Record<string, { password: string; role: Role }> = {
  operator: { password: "1234", role: "operator" },
  tech: { password: "abcd", role: "tech" },
  admin: { password: "admin", role: "admin" },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  login: (username, password) => {
    const record = USERS[username];
    if (!record) return false;
    if (record.password !== password) return false;

    set({ user: { username, role: record.role } });
    localStorage.setItem("auth_user", JSON.stringify({ username, role: record.role }));
    return true;
  },

  logout: () => {
    set({ user: null });
    localStorage.removeItem("auth_user");
  },
}));
