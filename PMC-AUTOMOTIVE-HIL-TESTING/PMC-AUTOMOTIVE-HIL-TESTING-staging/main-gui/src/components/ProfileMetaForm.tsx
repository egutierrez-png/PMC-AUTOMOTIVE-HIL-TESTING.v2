import type { CommProfile, ProtocolType } from "../types/Profile";

type Props = {
  meta: Partial<CommProfile>;
  onChange: (next: Partial<CommProfile>) => void;
};

export default function ProfileMetaForm({ meta, onChange }: Props) {
  const inputBase =
    "w-full rounded px-3 py-2 mt-1 transition " +
    "bg-slate-100 text-slate-800 border border-slate-300 " +
    "focus:border-accent focus:ring-1 focus:ring-accent " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 " +
    "dark:focus:border-accent dark:focus:ring-accent";

  const inputReadOnly =
    "w-full rounded px-3 py-2 mt-1 opacity-60 cursor-not-allowed " +
    "bg-slate-200 text-slate-700 border border-slate-300 " +
    "dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700";

  return (
    <div className="space-y-3">

      {/* Nombre */}
      <label className="text-sm">
        <span className="opacity-70">Nombre del perfil</span>
        <input
          className={inputBase}
          value={meta.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>

      {/* Protocolo */}
      <label className="text-sm">
        <span className="opacity-70">Protocolo</span>
        <select
          className={inputBase}
          value={meta.protocol ?? "CAN"}
          onChange={(e) =>
            onChange({
              ...meta,
              protocol: e.target.value as ProtocolType,
              schema:
                e.target.value === "CAN"
                  ? "pmc.can.profile/1"
                  : e.target.value === "UART"
                  ? "pmc.uart.profile/1"
                  : "pmc.lin.profile/1",
            })
          }
        >
          <option value="CAN">CAN</option>
          <option value="UART">UART</option>
          <option value="LIN">LIN</option>
        </select>
      </label>

      {/* Schema (read only) */}
      <label className="text-sm">
        <span className="opacity-70">Schema</span>
        <input
          readOnly
          className={inputReadOnly}
          value={meta.schema ?? ""}
        />
      </label>

      {/* Revisión */}
      <label className="text-sm">
        <span className="opacity-70">Revisión</span>
        <input
          type="number"
          className={inputBase}
          value={meta.revision ?? 1}
          onChange={(e) =>
            onChange({ revision: parseInt(e.target.value) || 1 })
          }
        />
      </label>

      {/* Timestamp (read-only) */}
      <label className="text-sm">
        <span className="opacity-70">Última modificación</span>
        <input
          readOnly
          className={inputReadOnly}
          value={meta.timestamp ?? ""}
        />
      </label>
    </div>
  );
}
