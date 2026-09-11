import { useState } from "react";
import { Panel } from "./Panel";
import { useRuntimeStore } from "../state/useRuntimeStore";
import type { TestResultRow, TestResultPayload } from "../types/TestResult";

function resolveResultStep(result: any, fallbackIndex: number, mode: string) {
  if (mode === "auto") {
    // En Automático, el PMC puede repetir el mismo "step" en varios
    // resultados seguidos — no es confiable, usamos la posición en el arreglo.
    return fallbackIndex + 1;
  }
  // En Manual, cada resultado llega individual, pero el "step" que reporta
  // el PMC sí es confiable aquí — lo usamos directamente.
  const raw = Number(result?.step);
  return Number.isFinite(raw) && raw > 0 ? raw : fallbackIndex + 1;
}

function parsePayload(row: TestResultRow): TestResultPayload | null {
  try {
    return JSON.parse(row.payload) as TestResultPayload;
  } catch {
    return null;
  }
}


export default function ResultsPanel() {
  const runtimeResults = useRuntimeStore((s) => s.results) as
    | TestResultPayload
    | null
    | undefined;
  const operationMode = useRuntimeStore((s) => s.mode);

  const runtimeList = runtimeResults?.results ?? [];

  const [historyRows, setHistoryRows] = useState<TestResultRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  const resultsApiReady = Boolean(window?.resultsApi);

  const handleLoadHistory = async () => {
    if (!window.resultsApi) return;
    setLoadingHistory(true);
    setExportMessage(null);
    try {
      const rows = await window.resultsApi.getRecent({ limit: 50, offset: 0 });
      setHistoryRows(rows);
      setHistoryVisible(true);
    } catch (err) {
      console.error(err);
      setExportMessage("Error loading history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportCsv = async () => {
    if (!window.resultsApi) return;
    const filePath = await window.resultsApi.exportCsv();
    setExportMessage(filePath ? `CSV exported to: ${filePath}` : "Export canceled");
  };

  const handleExportJson = async () => {
    if (!window.resultsApi) return;
    const filePath = await window.resultsApi.exportJson();
    setExportMessage(filePath ? `JSON exported to: ${filePath}` : "Export canceled");
  };

  const listToRender = runtimeList;

  return (
    <Panel title="Resultados">
      {/* Controles superiores */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <button
          className="border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
          onClick={handleLoadHistory}
          disabled={!resultsApiReady || loadingHistory}
        >
          {loadingHistory ? "Loading history..." : "Load last 50 (SQLite)"}
        </button>

        <button
          className="border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
          onClick={handleExportCsv}
          disabled={!resultsApiReady}
        >
          Export CSV
        </button>

        <button
          className="border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
          onClick={handleExportJson}
          disabled={!resultsApiReady}
        >
          Export JSON
        </button>
      </div>

      {exportMessage && (
        <div className="text-[10px] opacity-70 mb-2 truncate">
          {exportMessage}
        </div>
      )}

      {/* Runtime results (actual test) */}
      {!listToRender.length && (
        <div className="text-xs opacity-70">No results yet</div>
      )}

      {!!listToRender.length && (
        <table className="w-full text-xs">
          <thead className="opacity-60 text-left">
            <tr>
              <th>Step</th>
              <th>Command</th>
              <th>Measured</th>
              <th>t (ms)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
              {listToRender.map((r: any, idx: number) => {
              const displayStep = resolveResultStep(r, idx, operationMode);

              return (
                <tr
                  key={`${runtimeResults?.seq || "rt"}-${idx}`}
                  className="border-t border-slate-800"
                >
                  <td>{displayStep}</td>
                  <td>{r.message ?? ""}</td>
                  <td>{r.value_text ?? r.measured_position}</td>
                  <td>{r.response_time_ms}</td>
                  <td
                    className={
                      r.status === "PASS" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {r.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Histórico (resumido y togglable) */}
      {historyRows && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <button
            className="text-xs underline mb-2"
            onClick={() => setHistoryVisible((v) => !v)}
          >
            {historyVisible ? "Hide SQLite history" : "Show SQLite history"}
          </button>

          {historyVisible && (
            <>
              <div className="text-xs opacity-70 mb-1">Last 5 saved records</div>

              <ul className="text-[10px] space-y-1 max-h-32 overflow-auto">
                {historyRows.slice(0, 5).map((row) => {
                  const payload = parsePayload(row);

                  return (
                    <li key={row.id} className="opacity-80">
                      #{row.id} — {row.job_id ?? "N/A"} —{" "}
                      {payload?.overall ?? "?"} — {row.created_at}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
