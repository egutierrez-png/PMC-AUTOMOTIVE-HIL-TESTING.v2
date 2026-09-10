import { useConfigStore } from "../state/useConfigStore";

export const Station = 'EOL01'; // cámbialo por estación real

// Legado (se mantiene durante migración)
export const legacy = {
  jobs: 'actuator/test/jobs',
  status: (serial: string) => `actuator/test/status/${serial}`,
  results: (serial: string) => `actuator/test/results/${serial}`,
  heartbeat: 'actuator/test/heartbeat'
};

// Nuevo runtime
export function getTopics() {
  const station = useConfigStore.getState().stationId || "EOL01";

  return {
    profile: (family: string) => `pmc/${station}/profile/${family}`,
    recipe: `pmc/${station}/recipe`,
    control: `pmc/${station}/control`,
    status: `pmc/${station}/status`,
    modeStatus: `pmc/${station}/status/mode`,
    results: `pmc/${station}/results`,
    logRaw: `pmc/${station}/log/raw_can`,
    heartbeat: `pmc/${station}/heartbeat`
  };
};
