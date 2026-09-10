import { useEffect, useMemo, useState } from "react";
import { Panel } from "./Panel";
import type { TestResultRow, TestResultPayload } from "../types/TestResult";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function parsePayload(row: TestResultRow): TestResultPayload | null {
  try {
    return JSON.parse(row.payload) as TestResultPayload;
  } catch {
    return null;
  }
}

type OverallFilter = "ALL" | "PASS" | "FAIL";

const PAGE_SIZE = 25;

interface SparkPoint {
  index: number;
  value: number;
  created_at: string;
}

interface DailySummary {
  date: string;
  total: number;
  pass: number;
  fail: number;
  passRate: number;
}

export default function ResultsHistoryPanel() {
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [jobIdQuery, setJobIdQuery] = useState("");
  const [jobIdExact, setJobIdExact] = useState(false);
  const [serialQuery, setSerialQuery] = useState("");
  const [overallFilter, setOverallFilter] = useState<OverallFilter>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Paginación
  const [page, setPage] = useState(1);

  const resultsApiReady = typeof window !== "undefined" && !!window.resultsApi;

  const loadHistory = async () => {
    if (!window.resultsApi) {
      setError("SQLite bridge (resultsApi) is not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Traer últimos 500 (puedes subir si quieres más)
      const data = await window.resultsApi.getRecent({ limit: 500, offset: 0 });
      setRows(data);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError("Error loading history from SQLite");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== FILTRADO ==========
  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (jobIdQuery.trim()) {
      const q = jobIdQuery.trim();
      if (jobIdExact) {
        data = data.filter((r) => (r.job_id ?? "") === q);
      } else {
        const qLower = q.toLowerCase();
        data = data.filter((r) =>
          (r.job_id ?? "").toLowerCase().includes(qLower)
        );
      }
    }

    if (serialQuery.trim()) {
      const q = serialQuery.trim().toLowerCase();
      data = data.filter((r) =>
        (r.serial_number ?? "").toLowerCase().includes(q)
      );
    }

    if (overallFilter !== "ALL") {
      data = data.filter((r) => {
        const payload = parsePayload(r);
        const overall = (payload?.overall ?? r.overall ?? "").toUpperCase();
        return overall === overallFilter;
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      data = data.filter((r) => {
        const d = new Date(r.created_at);
        return d >= from;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      data = data.filter((r) => {
        const d = new Date(r.created_at);
        return d <= to;
      });
    }

    return data;
  }, [rows, jobIdQuery, jobIdExact, serialQuery, overallFilter, dateFrom, dateTo]);

  // ========== PAGINACIÓN ==========
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE) || 1
  );

  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage]);

  // ========== STATS GLOBALES ==========
  const stats = useMemo(() => {
    const total = filteredRows.length;
    let pass = 0;
    let fail = 0;

    for (const r of filteredRows) {
      const payload = parsePayload(r);
      const overall = (payload?.overall ?? r.overall ?? "").toUpperCase();
      if (overall === "PASS") pass++;
      else if (overall === "FAIL") fail++;
    }

    const passRate = total > 0 ? (pass / total) * 100 : 0;

    return { total, pass, fail, passRate };
  }, [filteredRows]);

  // ========== SPARKLINE PASS/FAIL ==========
  const sparkData: SparkPoint[] = useMemo(() => {
    // Ordenar por created_at ascendente
    const sorted = [...filteredRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return sorted.map((row, index) => {
      const payload = parsePayload(row);
      const overall = (payload?.overall ?? row.overall ?? "").toUpperCase();
      return {
        index,
        value: overall === "PASS" ? 1 : overall === "FAIL" ? 0 : 0.5,
        created_at: row.created_at,
      };
    });
  }, [filteredRows]);

  // ========== RESUMEN POR DÍA ==========
  const dailySummary: DailySummary[] = useMemo(() => {
    const map = new Map<string, { total: number; pass: number; fail: number }>();

    for (const row of filteredRows) {
      const day = row.created_at.slice(0, 10); // YYYY-MM-DD
      const payload = parsePayload(row);
      const overall = (payload?.overall ?? row.overall ?? "").toUpperCase();

      if (!map.has(day)) {
        map.set(day, { total: 0, pass: 0, fail: 0 });
      }
      const entry = map.get(day)!;
      entry.total++;
      if (overall === "PASS") entry.pass++;
      else if (overall === "FAIL") entry.fail++;
    }

    const list: DailySummary[] = [];
    for (const [date, v] of map.entries()) {
      const passRate = v.total > 0 ? (v.pass / v.total) * 100 : 0;
      list.push({ date, total: v.total, pass: v.pass, fail: v.fail, passRate });
    }

    // Ordenar por fecha descendente (más reciente primero)
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return list;
  }, [filteredRows]);

  // ========== EXPORT FILTRADO ==========
  const handleExportFilteredCsv = () => {
    if (!filteredRows.length) return;

    const header = [
      "id",
      "job_id",
      "serial_number",
      "overall",
      "timestamp",
      "seq",
      "created_at",
      "payload",
    ];

    const lines: string[] = [header.join(",")];

    for (const r of filteredRows) {
      const payload = parsePayload(r);
      const overall = (payload?.overall ?? r.overall ?? "") || "";

      const cols = [
        r.id,
        r.job_id ?? "",
        r.serial_number ?? "",
        overall,
        r.timestamp ?? "",
        r.seq ?? "",
        r.created_at ?? "",
        r.payload,
      ].map((v) => {
        // Escapamos usando JSON.stringify para evitar problemas con comas y saltos
        return JSON.stringify(String(v));
      });

      lines.push(cols.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pmc_results_filtered.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <Panel title="Historial de resultados (SQLite)">
      {/* Filtros */}
      <div className="mb-3 space-y-2 text-xs">
        {!resultsApiReady && (
          <div className="text-red-400">
            SQLite bridge (resultsApi) is not available in this context.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col">
            <label className="opacity-70 mb-0.5">Job ID</label>
            <input
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              value={jobIdQuery}
              onChange={(e) => setJobIdQuery(e.target.value)}
              placeholder="Search by job_id..."
            />
            <label className="mt-1 flex items-center gap-1">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={jobIdExact}
                onChange={(e) => setJobIdExact(e.target.checked)}
              />
              <span className="opacity-70 text-[10px]">Match exact</span>
            </label>
          </div>

          <div className="flex flex-col">
            <label className="opacity-70 mb-0.5">Serial</label>
            <input
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              placeholder="Search by serial..."
            />
          </div>

          <div className="flex flex-col">
            <label className="opacity-70 mb-0.5">Overall</label>
            <select
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              value={overallFilter}
              onChange={(e) => setOverallFilter(e.target.value as OverallFilter)}
            >
              <option value="ALL">All</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="opacity-70 mb-0.5">From</label>
            <input
              type="date"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="opacity-70 mb-0.5">To</label>
            <input
              type="date"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex flex-col justify-end gap-1">
            <button
              className="border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
              onClick={loadHistory}
              disabled={loading || !resultsApiReady}
            >
              {loading ? "Reloading..." : "Reload"}
            </button>
            <button
              className="border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
              onClick={handleExportFilteredCsv}
              disabled={!filteredRows.length}
            >
              Export filtered (CSV)
            </button>
          </div>
        </div>

        {/* Stats + Sparkline */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="text-[11px] opacity-80">
            Total: <span className="font-mono">{stats.total}</span>
          </div>
          <div className="text-[11px] text-green-400">
            PASS: <span className="font-mono">{stats.pass}</span>
          </div>
          <div className="text-[11px] text-red-400">
            FAIL: <span className="font-mono">{stats.fail}</span>
          </div>
          <div className="text-[11px] opacity-80">
            PASS rate:{" "}
            <span className="font-mono">
              {stats.passRate.toFixed(1)}%
            </span>
          </div>

          {/* Sparkline PASS/FAIL */}
          <div className="flex-1 min-w-[120px] h-10">
            {sparkData.length > 1 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <XAxis dataKey="index" hide />
                  <YAxis domain={[-0.1, 1.1]} hide />
                  <Tooltip
                    formatter={(value: number) =>
                      value === 1
                        ? "PASS"
                        : value === 0
                        ? "FAIL"
                        : "UNKNOWN"
                    }
                    labelFormatter={(idx) =>
                      `Index: ${idx as number}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e" // verde-ish
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 mb-2">
          {error}
        </div>
      )}

      {/* Tabla principal */}
      <div className="border border-slate-800 rounded overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-slate-900/70">
            <tr className="text-left">
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Job ID</th>
              <th className="px-2 py-1">Serial</th>
              <th className="px-2 py-1">Overall</th>
              <th className="px-2 py-1">Created</th>
              <th className="px-2 py-1">Seq</th>
              <th className="px-2 py-1 w-20">Details</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-2 text-center opacity-70"
                >
                  No records match the filters
                </td>
              </tr>
            )}

            {pageRows.map((row) => {
              const payload = parsePayload(row);
              const overall =
                (payload?.overall ?? row.overall ?? "").toUpperCase();
              const statusClass =
                overall === "PASS"
                  ? "text-green-400"
                  : overall === "FAIL"
                  ? "text-red-400"
                  : "opacity-80";

              const isExpanded = expandedId === row.id;

              return (
                <>
                  <tr
                    key={row.id}
                    className="border-t border-slate-800 hover:bg-slate-900/40"
                  >
                    <td className="px-2 py-1 font-mono">{row.id}</td>
                    <td className="px-2 py-1">{row.job_id ?? "—"}</td>
                    <td className="px-2 py-1">
                      {row.serial_number ?? "—"}
                    </td>
                    <td className={`px-2 py-1 ${statusClass}`}>
                      {overall || "—"}
                    </td>
                    <td className="px-2 py-1">
                      <div className="truncate max-w-[160px]">
                        {row.created_at}
                      </div>
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {row.seq ?? "—"}
                    </td>
                    <td className="px-2 py-1">
                      <button
                        className="underline"
                        onClick={() => toggleExpand(row.id)}
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && payload && (
                    <tr
                      className="border-t border-slate-900"
                      key={`${row.id}-details`}
                    >
                      <td colSpan={7} className="bg-slate-950 px-3 py-2">
                        <div className="text-[11px] opacity-80 mb-1">
                          Steps ({payload.results.length})
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead className="opacity-70 text-left">
                              <tr>
                                <th className="px-1 py-0.5">#</th>
                                <th className="px-1 py-0.5">Command</th>
                                <th className="px-1 py-0.5">Measured</th>
                                <th className="px-1 py-0.5">t (ms)</th>
                                <th className="px-1 py-0.5">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payload.results.map((r, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-slate-800/60"
                                >
                                  <td className="px-1 py-0.5">
                                    {r.step ?? idx + 1}
                                  </td>
                                  <td className="px-1 py-0.5">
                                    {r.command ?? "—"}
                                  </td>
                                  <td className="px-1 py-0.5">
                                    {r.measured_position}
                                  </td>
                                  <td className="px-1 py-0.5">
                                    {r.response_time_ms}
                                  </td>
                                  <td
                                    className={`px-1 py-0.5 ${
                                      r.status === "PASS"
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {r.status}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <div className="opacity-70">
          Page {currentPage} of {totalPages} — {filteredRows.length} records
        </div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 border border-slate-700 rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 border border-slate-700 rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Resumen por día */}
      {dailySummary.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <div className="text-xs opacity-80 mb-1">Daily summary</div>
          <div className="max-h-40 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="opacity-70 text-left">
                <tr>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Total</th>
                  <th className="px-2 py-1">PASS</th>
                  <th className="px-2 py-1">FAIL</th>
                  <th className="px-2 py-1">% PASS</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((d) => (
                  <tr key={d.date} className="border-t border-slate-800">
                    <td className="px-2 py-1">{d.date}</td>
                    <td className="px-2 py-1 font-mono">{d.total}</td>
                    <td className="px-2 py-1 font-mono text-green-400">
                      {d.pass}
                    </td>
                    <td className="px-2 py-1 font-mono text-red-400">
                      {d.fail}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {d.passRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}
