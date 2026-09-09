import { signalRegistry } from "../registry/registry";
import { useSignalsStore } from "../../../state/useSignalsStore";

function getByPath(obj: any, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function parseResults(resultsObj: any) {
  const signals = signalRegistry.getBySource("RESULTS");
  const addValue = useSignalsStore.getState().addValue;

  signals.forEach(sig => {
    const raw = getByPath(resultsObj, sig.path ?? sig.name);
    if (sig.name === "result_status_flag") {
        const v = raw === "PASS" ? 1 : 0;
        addValue(sig.name, v);
        return;
      }
    addValue(sig.name, raw * (sig.scale ?? 1));
  });
}
