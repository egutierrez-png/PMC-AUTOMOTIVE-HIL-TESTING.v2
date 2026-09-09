import { Panel } from "./Panel";
import { useRuntimeStore } from "../state/useRuntimeStore";

export default function StatusPanel() {
  const status = useRuntimeStore(s => s.status);
  const st = status?.status ?? "IDLE";

  return (
    <Panel title="Status">
      <ul className="space-y-2 text-sm gid grid-cols-1">
        {["RUNNING","IDLE","DONE","ERROR"].map(s => (
          <li key={s} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${st===s ? 'bg-green-400' : 'bg-slate-700'}`} />
            {s}
          </li>
        ))}
      </ul>
      {status && (
        <div className="text-xs mt-2 opacity-70">
          Step {status.current_step} / {status.total_steps}  
          <br/>
          {status.message}
        </div>
      )}
    </Panel>
  );
}
