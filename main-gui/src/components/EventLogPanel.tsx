import { Panel } from "./Panel";
import { useToastStore } from "../store/useToastStore";
import { CheckCircle, Info, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import type { JSX } from "react";

export default function EventLogPanel() {
  const { history, clearHistory } = useToastStore();

  const icons: Record<string, JSX.Element> = {
    success: <CheckCircle className="text-green-400 w-4 h-4" />,
    info: <Info className="text-blue-400 w-4 h-4" />,
    warn: <AlertTriangle className="text-yellow-400 w-4 h-4" />,
    error: <XCircle className="text-red-500 w-4 h-4" />,
  };

  return (
    <Panel title="Registro de eventos">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs opacity-60">
          Últimos {history.length} eventos
        </span>
        <button
          onClick={clearHistory}
          className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-sm opacity-60">No hay eventos registrados.</div>
      ) : (
        <ul className="text-sm max-h-64 overflow-auto divide-y divide-white/10">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between py-2 px-1 hover:bg-white/5 rounded"
            >
              <div className="flex items-center gap-2">
                {icons[h.type]}
                <span>{h.text}</span>
              </div>
              <span className="text-xs opacity-50">{h.timestamp}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
