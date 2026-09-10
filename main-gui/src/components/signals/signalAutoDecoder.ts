import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useProfilesStore } from "../../state/useProfilesStore";
import { useSignalsStore } from "../../state/useSignalsStore";
import { extractPaths } from "../../utils/jsonPaths";

export function setupSignalAutoDecoder() {
  let lastStatusTS = 0;
  let lastResultsTS = 0;
  let lastCANFrameTS = 0;

  useRuntimeStore.subscribe((state) => {
    const profile = useProfilesStore.getState().profiles.find(
      p => p.id === useProfilesStore.getState().selectedId
    );
    if (!profile || !profile.signalMap) return;

    const addValue = useSignalsStore.getState().addValue;

    // ==========================
    // STATUS
    // ==========================
    if (state.lastStatus && state.lastStatus.ts !== lastStatusTS) {
      lastStatusTS = state.lastStatus.ts;

      profile.signalMap
        .filter(s => s.source === "STATUS" && s.path)
        .forEach(s => {
          const val = extractPaths(state.lastStatus, s.path);
          if (typeof val === "number") addValue(s.name, val);
        });
    }

    // ==========================
    // RESULTS
    // ==========================
    if (state.lastResults && state.lastResults.length > 0) {
      const r = state.lastResults[0];
      if (r.seq !== lastResultsTS) {
        lastResultsTS = r.seq;

        profile.signalMap
          .filter(s => s.source === "RESULTS" && s.path)
          .forEach(s => {
            const val = extractPaths(r, s.path);
            if (typeof val === "number") addValue(s.name, val);
          });
      }
    }

    // ==========================
    // RAW CAN
    // ==========================
    if (state.lastCANFrame && state.lastCANFrame.ts !== lastCANFrameTS) {
      const frame = state.lastCANFrame;
      lastCANFrameTS = frame.ts;

      profile.signalMap
        .filter(s => s.source === "CAN" && s.frameId === frame.id)
        .forEach(s => {
        if (
            !frame.data ||
            s.byteOffset == null ||
            s.length == null ||
            s.byteOffset < 0 ||
            s.length <= 0 ||
            frame.data.length < s.byteOffset + s.length
        ) {
            return; // no se puede decodificar esta señal
        }

        const slice = frame.data.slice(s.byteOffset, s.byteOffset + s.length);
          let raw = 0;

          if (s.type === "uint8") raw = slice[0];
          if (s.type === "uint16") raw = (slice[1] << 8) | slice[0];
          if (s.type === "int16") {
            const v = (slice[1] << 8) | slice[0];
            raw = v > 32767 ? v - 65536 : v;
          }
          if (s.type === "float") {
            const buf = new Uint8Array(slice).buffer;
            raw = new DataView(buf).getFloat32(0, true);
          }

          const scaled = s.scale ? raw * s.scale : raw;

          addValue(s.name, scaled);
        });
    }
  });
}
