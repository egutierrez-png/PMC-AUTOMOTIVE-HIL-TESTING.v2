import { useEffect, useRef } from "react";
import { useAuthStore } from "../state/useAuthStore";
import { useToastStore } from "../store/useToastStore";

export function useAutoLogout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pushToast = useToastStore((s) => s.push);

  const timer = useRef<NodeJS.Timeout | null>(null);

  const getTimeoutForRole = () => {
    if (!user) return null;

    switch (user.role) {
      case "operator":
        return null; // ❌ sin expiración
      case "tech":
        return 5 * 60 * 1000; // 5 min
      case "admin":
        return 2 * 60 * 1000; // 2 min
      default:
        return null;
    }
  };

  const resetTimer = () => {
    const timeoutMs = getTimeoutForRole();

    // ninguna expiración → no activar temporizador
    if (!timeoutMs) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      return;
    }

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      // suave fade
      document.body.classList.add("fade-logout");

      setTimeout(() => {
        logout();
        pushToast("Sesión cerrada por inactividad", "warn");
        document.body.classList.remove("fade-logout");
      }, 150);
    }, timeoutMs);
  };

  useEffect(() => {
    if (!user) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }

    const events = ["mousemove", "keydown", "click", "wheel", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user]);
}
