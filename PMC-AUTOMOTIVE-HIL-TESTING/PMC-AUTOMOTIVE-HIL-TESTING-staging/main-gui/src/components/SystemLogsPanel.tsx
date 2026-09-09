import { Panel } from "./Panel";
import { useLogStore } from "../state/useLogStore";
import { Trash2, Download, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../state/useAuthStore";

export default function SystemLogsPanel() {
  const logStore = useLogStore();
  const [lastLogTime, setLastLogTime] = useState<string | null>(null);

  // 🔐 Control de permisos
  const user = useAuthStore((s) => s.user);
  const isTechReadOnly = user?.role === "tech";

  useEffect(() => {
    if (logStore.logs.length > 0) {
      setLastLogTime(logStore.logs[0].ts);
    }
  }, [logStore.logs]);

  const handleExport = () => {
    if (isTechReadOnly) return;
    logStore.exportJson();
  };

  const handleClear = () => {
    if (isTechReadOnly) return;

    const confirmed = confirm(
      "¿Seguro que deseas eliminar todos los logs locales y de disco?"
    );
    if (!confirmed) return;

    logStore.clear();

    if ((window as any).process?.versions?.electron) {
      (window as any).electronAPI?.cleanupLogs?.();
    }

    alert("🧹 Logs limpiados correctamente");
  };

  return (
    <Panel title="System Logs">
      <div className="flex flex-col gap-3 text-sm">
        <p className="opacity-70">
          Administra los registros del sistema (logs MQTT, eventos y resultados).
        </p>

        <div className="flex flex-col md:flex-row justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Último log:</span>
            <span className="font-mono text-slate-100">
              {lastLogTime ? new Date(lastLogTime).toLocaleString() : "—"}
            </span>
          </div>
          <div className="opacity-70">
            Total: {logStore.logs.length.toLocaleString()} registros
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap gap-3 mt-2">
          <button
            onClick={handleClear}
            disabled={isTechReadOnly}
            className={`
              flex items-center gap-2 px-3 py-2 rounded text-white text-sm
              ${isTechReadOnly
                ? "bg-slate-700 cursor-not-allowed opacity-50"
                : "bg-red-700 hover:bg-red-600"}
            `}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Logs
          </button>

          <button
            onClick={handleExport}
            disabled={isTechReadOnly}
            className={`
              flex items-center gap-2 px-3 py-2 rounded text-white text-sm
              ${isTechReadOnly
                ? "bg-slate-700 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-500"}
            `}
          >
            <Download className="w-4 h-4" />
            Exportar JSON
          </button>
        </div>
      </div>
    </Panel>
  );
}
