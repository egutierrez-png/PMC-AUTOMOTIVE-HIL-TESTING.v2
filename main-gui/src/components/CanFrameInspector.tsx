import { useRuntimeStore } from "../state/useRuntimeStore";
import { useState } from "react";

type Props = {
  frameId?: number;
  byteOffset?: number;
  length?: number;
  type?: string; // from SignalDefinition
  scale?: number;
  onSelect?: (offset: number, length: number) => void;
};

function decodeValue(bytes: number[], offset: number, len: number, type: string, endianness: "le" | "be") {
  const slice = bytes.slice(offset, offset + len);
  if (slice.length < len) return null;

  let buf = Uint8Array.from(slice).buffer;
  let view = new DataView(buf);

  switch (type) {
    case "uint8": return view.getUint8(0);
    case "int8": return view.getInt8(0);
    case "uint16": return endianness === "le" ? view.getUint16(0, true) : view.getUint16(0, false);
    case "int16": return endianness === "le" ? view.getInt16(0, true) : view.getInt16(0, false);
    case "uint32": return endianness === "le" ? view.getUint32(0, true) : view.getUint32(0, false);
    case "int32": return endianness === "le" ? view.getInt32(0, true) : view.getInt32(0, false);
    case "float": return endianness === "le" ? view.getFloat32(0, true) : view.getFloat32(0, false);
    default: return null;
  }
}

export default function CanFrameInspector({
  frameId,
  byteOffset = 0,
  length = 1,
  type = "uint8",
  scale,
  onSelect,
}: Props) {
  
  const last = useRuntimeStore((s) => s.lastCANFrame);
  const [endian, setEndian] = useState<"le" | "be">("le");

  if (!last) {
    return (
      <div className="text-xs opacity-60">
        Esperando un frame CAN... (ejecuta el dispositivo)
      </div>
    );
  }

  const bytes = last.data ?? [];
  const rawValue = decodeValue(bytes, byteOffset, length, type, endian);
  const scaledValue = rawValue != null && scale != null ? rawValue * scale : null;

  const highlight = (i: number) =>
    i >= byteOffset && i < byteOffset + length;

  return (
    <div className="space-y-2">

      {/* Frame ID */}
      <div className="text-xs">
        <strong>Frame ID:</strong> 0x{last.id.toString(16).toUpperCase()}
      </div>

      {/* Byte grid */}
      <div className="grid grid-cols-8 gap-1 text-center">
        {bytes.map((b, i) => (
          <div
            key={i}
            className={`
              px-2 py-1 rounded border text-xs cursor-pointer
              ${highlight(i)
                ? "bg-yellow-500 text-black border-yellow-300"
                : "bg-slate-800 border-slate-700 hover:bg-slate-700"}
            `}
            onClick={() => onSelect?.(i, length)}
          >
            {b.toString(16).padStart(2, "0").toUpperCase()}
            <div className="text-[10px] opacity-70">[{i}]</div>
          </div>
        ))}
      </div>

      {/* Decoded value */}
      <div className="mt-3 p-2 bg-slate-800 rounded text-xs">
        <div>
          <strong>Selected bytes:</strong>{" "}
          {bytes.slice(byteOffset, byteOffset + length)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")}
        </div>

        <div><strong>Raw value:</strong> {rawValue ?? "—"}</div>
        <div><strong>Scaled value:</strong> {scaledValue ?? "—"}</div>

        <div className="mt-2 flex gap-2">
          <label className="text-xs opacity-70">Endianness:</label>
          <button
            onClick={() => setEndian("le")}
            className={`px-2 py-1 rounded ${
              endian === "le" ? "bg-accent text-black" : "bg-slate-700"
            }`}
          >
            LE
          </button>
          <button
            onClick={() => setEndian("be")}
            className={`px-2 py-1 rounded ${
              endian === "be" ? "bg-accent text-black" : "bg-slate-700"
            }`}
          >
            BE
          </button>
        </div>
      </div>

      {/* Length selector */}
      <div className="flex gap-2 mt-2">
        {[1, 2, 4].map((n) => (
          <button
            key={n}
            onClick={() => onSelect?.(byteOffset, n)}
            className={`px-2 py-1 rounded text-xs ${
              length === n ? "bg-accent text-black" : "bg-slate-700"
            }`}
          >
            {n} byte{n > 1 ? "s" : ""}
          </button>
        ))}
      </div>

    </div>
  );
}
