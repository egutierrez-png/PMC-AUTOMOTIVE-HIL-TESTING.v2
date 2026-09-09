import React, { useState, useMemo, type JSX } from "react";
import { Panel } from "./Panel";
import { useLogStore } from "../state/useLogStore";
import {
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Download,
} from "lucide-react";

export default function ExecutionLogPanel() {
  const { logs, clear, exportJson } = useLogStore();

  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error" | "debug">("all");
  const [search, setSearch] = useState("");

  // Filtrado + búsqueda
  const filtered = useMemo(() => {
    return logs
      .filter((l) => filter === "all" || l.type === filter)
      .filter((l) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          l.message?.toLowerCase().includes(q) ||
          l.topic?.toLowerCase().includes(q) ||
          JSON.stringify(l.data ?? "").toLowerCase().includes(q)
        );
      });
  }, [logs, filter, search]);

  // Iconos por tipo
  const icons: Record<string, JSX.Element> = {
    info: <Info className="text-blue-600 dark:text-blue-400 w-4 h-4" />,
    warn: <AlertTriangle className="text-yellow-600 dark:text-yellow-400 w-4 h-4" />,
    error: <XCircle className="text-red-600 dark:text-red-400 w-4 h-4" />,
    debug: <CheckCircle className="text-slate-500 dark:text-slate-400 w-4 h-4" />,
  };

  return (
    <Panel title="Execution Log">

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 dark:text-slate-300" />

          {["all", "info", "warn", "error", "debug"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`
                px-2 py-1 text-xs rounded border transition-colors

                ${filter === t
                  ? "bg-accent text-black border-accent"
                  : `
                    bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300
                    dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700
                  `
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search + buttons */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-300" />

          <input
            className="
              px-2 py-1 text-sm rounded border transition 

              bg-white text-slate-800 border-slate-300
              focus:ring-2 focus:ring-blue-400 focus:border-blue-400

              dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
              dark:focus:ring-blue-500 dark:focus:border-blue-500
            "
            placeholder="Buscar texto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={clear}
            className="
              flex items-center gap-1 px-2 py-1 text-xs rounded border transition

              bg-red-600 text-white border-red-700 hover:bg-red-500
            "
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>

          <button
            onClick={exportJson}
            className="
              flex items-center gap-1 px-2 py-1 text-xs rounded border transition

              bg-slate-300 text-slate-800 border-slate-400 hover:bg-slate-200
              dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600
            "
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div
        className="
          max-h-64 overflow-auto divide-y text-sm font-mono rounded border transition

          bg-slate-100 border-slate-300 divide-slate-300/50
          dark:bg-slate-900/60 dark:border-slate-700 dark:divide-slate-700/30
        "
      >
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-slate-600 dark:text-slate-400">
            No hay registros que coincidan.
          </div>
        ) : (
          filtered.map((l, i) => (
            <div
              key={i}
              className="
                flex items-start gap-3 py-1 px-2 transition

                hover:bg-slate-200/40 
                dark:hover:bg-slate-700/40
              "
            >
              {icons[l.type] || icons["debug"]}

              <div className="flex-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  [{new Date(l.ts).toLocaleTimeString("es-MX", { hour12: false })}]
                </span>{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {l.topic}
                </span>{" "}
                <span className="text-slate-700 dark:text-slate-300">
                  {l.message}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
