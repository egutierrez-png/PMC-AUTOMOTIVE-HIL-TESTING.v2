import { useState } from "react";
import ExecutionLogPanel from "./ExecutionLogPanel";
import EventLogPanel from "./EventLogPanel";

export default function LogsTabsPanel() {
  const [tab, setTab] = useState<"execution" | "events">("execution");

  const inactiveTab =
    "bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300 \
     dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700";

  return (
    <div className="flex flex-col gap-2">
      
      {/* HEADER DE TABS */}
      <div className="flex gap-2 mb-2">

        {/* TAB: EXECUTION */}
        <button
          onClick={() => setTab("execution")}
          className={`
            px-4 py-2 rounded-t-xl font-semibold text-sm border transition

            ${tab === "execution"
              ? "bg-accent text-black border-accent"
              : inactiveTab}
          `}
        >
          Execution Log
        </button>

        {/* TAB: EVENTS */}
        <button
          onClick={() => setTab("events")}
          className={`
            px-4 py-2 rounded-t-xl font-semibold text-sm border transition

            ${tab === "events"
              ? "bg-accent text-black border-accent"
              : inactiveTab}
          `}
        >
          Event Log
        </button>
      </div>

      {/* CONTENIDO */}
      <div
        className="
          rounded-b-xl p-3 border transition

          bg-slate-100 border-slate-300
          dark:bg-slate-900/60 dark:border-slate-700
        "
      >
        {tab === "execution" ? <ExecutionLogPanel /> : <EventLogPanel />}
      </div>
    </div>
  );
}
