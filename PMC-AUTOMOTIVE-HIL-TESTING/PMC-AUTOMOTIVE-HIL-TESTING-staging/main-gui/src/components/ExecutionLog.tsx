import { useEffect, useRef } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { Panel } from "./Panel";

type LogEntry = {
  ts: string;
  text: string;
  level?: "info" | "warn" | "error";
};

const MAX_LOGS = 200;

export default function ExecutionLog() {
  const status = useRuntimeStore((s) => s.status);
  const results = useRuntimeStore((s) => s.results);
  const heartbeat = useRuntimeStore((s) => s.heartbeat);

  const logRef = useRef<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rerender = useRef(0);

  const addLog = (msg: string, level: LogEntry["level"] = "info") => {
    const ts = new Date().toLocaleTimeString();
    logRef.current.push({ ts, text: msg, level });

    if (logRef.current.length > MAX_LOGS) logRef.current.shift();

    rerender.current++;

    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!status) return;

    if (status.status === "RUNNING")
      addLog(
        `▶ Running step ${status.current_step}/${status.total_steps}: ${status.message}`
      );

    if (status.status === "DONE")
      addLog(`✅ Test completed successfully`, "info");

    if (status.status === "ERROR")
      addLog(`❌ Error: ${status.error?.message || "Unknown error"}`, "error");
  }, [status]);

  useEffect(() => {
    if (!results?.results) return;

    for (const r of results.results) {
      const msg = `[Step ${r.step}] ${r.command || "Cmd"} → ${r.status} (${r.response_time_ms} ms)`;
      addLog(msg, r.status === "PASS" ? "info" : "warn");
    }
  }, [results]);

  useEffect(() => {
    if (!heartbeat) return;
    addLog(`💓 Heartbeat: ${heartbeat.device || "PMC"} online`, "info");
  }, [heartbeat]);

  const logs = [...logRef.current];

  return (
    <Panel title="Execution Log">
      <div
        ref={containerRef}
        className="
          h-48 overflow-y-auto text-xs font-mono p-2 rounded-lg border transition

          bg-slate-200 border-slate-300 text-slate-800
          dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-200
        "
      >
        {logs.length === 0 && (
          <div className="opacity-60">Esperando mensajes...</div>
        )}

        {logs.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="opacity-50">{l.ts}</span>

            <span
              className={`
                ${l.level === "error" ? "text-red-500 dark:text-red-400" : ""}
                ${l.level === "warn" ? "text-yellow-600 dark:text-yellow-400" : ""}
                ${l.level === "info" ? "text-slate-700 dark:text-slate-200" : ""}
              `}
            >
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
