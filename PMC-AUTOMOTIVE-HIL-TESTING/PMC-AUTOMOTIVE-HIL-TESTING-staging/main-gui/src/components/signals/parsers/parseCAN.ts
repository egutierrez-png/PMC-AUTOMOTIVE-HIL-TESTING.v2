import { signalRegistry } from "../registry/registry";
import { useSignalsStore } from "../../../state/useSignalsStore";
import { useRuntimeStore } from "../../../state/useRuntimeStore";

function decodeValue(data: number[], offset: number, length: number, type?: string) {
  let raw = 0;

  if (length === 1) raw = data[offset];
  if (length === 2) raw = data[offset] | (data[offset + 1] << 8);
  if (length === 4) {
    raw =
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24);
  }

  if (type === "int16" && length === 2) {
    if (raw & 0x8000) raw = raw - 0x10000;
  }

  // Para float habría que crear DataView con ArrayBuffer, si lo necesitas
  return raw;
}

export function parseCANFrame(frame: { id: number; data: number[] }) {
  const { id, data } = frame;
  const signals = signalRegistry.getForCAN(id);
  const addValue = useSignalsStore.getState().addValue;
  useRuntimeStore.getState().setLastCANFrame(frame);

  signals.forEach(sig => {
    if (sig.byteOffset == null || sig.length == null) return;

    const raw = decodeValue(data, sig.byteOffset, sig.length, sig.type);
    const scaled = raw * (sig.scale ?? 1);
    addValue(sig.name, scaled);
  });
}
