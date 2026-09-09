import { Panel } from "../Panel";
import { useSignalsStore } from "../../state/useSignalsStore";

export default function SignalsConfigPanel() {
  const {
    availableSignals,
    selectedSignals,
    toggleSignal,
    running,
    start,
    pause,
    clear
  } = useSignalsStore();

  return (
    <Panel title="Signals Configuration">
      <div className="flex flex-col gap-3">
        
        {availableSignals.map(sig => (
          <label key={sig} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedSignals.includes(sig)}
              onChange={() => toggleSignal(sig)}
            />
            <span>{sig}</span>
          </label>
        ))}

        <div className="flex gap-2 mt-2">
          {!running ? (
            <button
              className="px-3 py-2 bg-green-500 text-black rounded"
              onClick={start}
            >
              Start
            </button>
          ) : (
            <button
              className="px-3 py-2 bg-yellow-500 text-black rounded"
              onClick={pause}
            >
              Pause
            </button>
          )}

          <button
            className="px-3 py-2 bg-red-500 text-black rounded"
            onClick={clear}
          >
            Clear
          </button>
        </div>

      </div>
    </Panel>
  );
}
