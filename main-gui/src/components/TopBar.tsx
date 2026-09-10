import { useConfigStore } from "../state/useConfigStore";
import { useAuthStore } from "../state/useAuthStore";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useThemeStore } from "../state/useThemeStore";
import { Sun, Moon } from "lucide-react";
import logo from "../assets/Optimotion.svg";

type Tab = "operator" |"run" | "recipes" | "profiles" | "config" | "signals";

export default function Topbar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const { stationId } = useConfigStore();
  const pmcOnline = useRuntimeStore((s) => s.pmcOnline);
  const { theme, toggle } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const Item = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => onChange(id)}
      className={`
        px-4 py-2 rounded-xl text-sm font-semibold transition border

        ${active === id
          ? "bg-accent text-black border-accent"
          : `
            bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300
            dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700
          `}
      `}
    >
      {label}
    </button>
  );

  const roleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-600";
      case "tech":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <header
      className="
        flex items-center justify-between mb-4 px-3 py-2 rounded-xl border shadow-md

        bg-white border-slate-300 shadow-gray-300
        dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/40
      "
    >
      {/* IZQUIERDA: LOGO + TÍTULO */}
      <div className="flex items-center gap-3 mr-4">
        <img
          src={logo}
          alt="Logo"
          className="h-8 w-auto select-none"
        />

        {/* <div className="text-sm font-bold text-accent dark:text-accent-light">
          Opti-PT
        </div> */}
      </div>

      {/* STATUS */}
      <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        Estación: <strong>{stationId}</strong>

        {pmcOnline ? (
          <span className="px-2 py-0.5 text-xs rounded bg-green-600 text-black font-semibold mr-3">
            ONLINE
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs rounded bg-red-700 text-white font-semibold mr-3">
            OFFLINE
          </span>
        )}
      </span>

      {/* NAV */}
      <nav className="flex gap-2">
        <Item id="operator" label="Operador" />
        <Item id="run" label="Ejecución" />
        <Item id="recipes" label="Recetas" />
        <Item id="profiles" label="Perfiles" />
        <Item id="config" label="Configuración" />
        <Item id="signals" label="Señales" />
      </nav>

      {/* USER SECTION */}
      <div className="flex items-center gap-3">

        {/* BOTÓN SOL / LUNA */}
        <button
          onClick={toggle}
          className="
            rounded-lg p-2 transition border

            bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700
            dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200
          "
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <>
            <div
              className={`
                px-3 py-1 rounded text-sm font-semibold text-black
                ${roleColor(user.role)}
              `}
            >
              {user.username} ({user.role})
            </div>

            <button
              onClick={logout}
              className="
                px-3 py-1 rounded text-sm transition 
                bg-slate-300 hover:bg-slate-400 text-black
                dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white
              "
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <div className="px-3 py-1 text-sm opacity-70 dark:text-slate-400 text-slate-600">
              No autenticado
            </div>

            <button
              onClick={() => onChange("config" as Tab)}
              className="
                px-3 py-1 rounded text-sm font-semibold transition
                bg-blue-500 hover:bg-blue-400 text-white
                dark:bg-blue-600 dark:hover:bg-blue-500
              "
            >
              Iniciar sesión
            </button>
          </>
        )}
      </div>
    </header>
  );
}
