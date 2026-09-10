import { signalRegistry } from "../registry/registry";
import { useSignalsStore } from "../../../state/useSignalsStore";

function getByPath(obj: any, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function parseStatus(statusObj: any) {
  const signals = signalRegistry.getBySource("STATUS");

  const addValue = useSignalsStore.getState().addValue;

  signals.forEach(sig => {
    const raw = getByPath(statusObj, sig.path ?? sig.name);
    if (sig.name === "status_running_flag") {
        const v = raw === 'RUNNING' ? 1 : 0;
        addValue(sig.name, v);
        return;
    }

    const scaled = raw * (sig.scale ?? 1);
    addValue(sig.name, scaled);
  });
}
