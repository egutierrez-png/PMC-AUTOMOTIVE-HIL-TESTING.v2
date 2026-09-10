import { Panel } from "./Panel";
import { useRuntimeStore } from "../state/useRuntimeStore";

type StatusPanelProps = {
  layout?: "vertical" | "horizontal";
};

export default function StatusPanel({ layout = "vertical" }: StatusPanelProps) {
  const status = useRuntimeStore(s => s.status);
  const st = status?.status ?? "IDLE";
  const isHorizontal = layout === "horizontal";
  const labels: Record<string, string> = {
    RUNNING: "EJECUTANDO",
    IDLE: "EN ESPERA",
    DONE: "COMPLETADO",
    ERROR: "ERROR",
  };

  return (
    <Panel title="Estado">
      <ul
        className={`grid ${
          isHorizontal
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 text-sm md:text-lg lg:text-[8px]"
            : "grid-cols-1 gap-2 text-sm"
        }`}
      >
        {["RUNNING","IDLE","DONE","ERROR"].map(s => (
          <li
            key={s}
            className={`flex items-center min-w-0 ${
              isHorizontal ? "gap-1 md:gap-2 whitespace-nowrap overflow-hidden text-ellipsis" : "gap-2"
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${st===s ? 'bg-green-400' : 'bg-slate-700'}`} />
            <span className={isHorizontal ? "truncate" : ""}>{labels[s]}</span>
          </li>
        ))}
      </ul>
      {status && (
        <div className="text-xs mt-2 opacity-70">
          Paso {status.current_step} / {status.total_steps}  
          <br/>
          {status.message}
        </div>
      )}
    </Panel>
  );
}
