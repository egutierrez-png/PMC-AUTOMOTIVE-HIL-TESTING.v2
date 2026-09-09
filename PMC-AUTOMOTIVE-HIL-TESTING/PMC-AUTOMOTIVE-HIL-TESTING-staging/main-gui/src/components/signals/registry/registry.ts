import { defaultSignalMap } from "./defaultMap";
import type { SignalDefinition, SignalSource } from "./type";

class SignalRegistry {
  private baseSignals = defaultSignalMap;
  private activeMap = defaultSignalMap;

  loadProfileMap(map?: SignalDefinition[]) {
    this.activeMap = map && map.length > 0 ? map : this.baseSignals;
  }

  getAll() {
    return this.activeMap;
  }

  getBySource(src: string) {
    return this.activeMap.filter(s => s.source === src);
  }

  getForCAN(frameId: number | undefined) {
    return this.activeMap.filter(s => s.source === "CAN" && s.frameId === frameId);
  }
}

export const signalRegistry = new SignalRegistry();
