type Props = {
  data: {
    bitrate?: number;
    tx_id?: string;
    rx_id?: string;
    extended?: boolean;
  };
  onChange: (next: any) => void;
};

export default function ProfileCANForm({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  const inputBase =
    "w-full rounded px-3 py-2 mt-1 transition-colors border text-sm " +
    "bg-slate-100 text-slate-800 border-slate-300 " +
    "focus:ring-2 focus:ring-blue-400 focus:border-blue-400 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 " +
    "dark:focus:ring-blue-500 dark:focus:border-blue-500";

  return (
    <div className="space-y-3">

      <label className="text-sm">
        Bitrate
        <input
          type="number"
          className={inputBase}
          value={data.bitrate ?? 250000}
          onChange={(e) => update({ bitrate: Number(e.target.value) })}
        />
      </label>

      <label className="text-sm">
        TX ID
        <input
          className={inputBase}
          value={data.tx_id ?? ""}
          onChange={(e) => update({ tx_id: e.target.value })}
        />
      </label>

      <label className="text-sm">
        RX ID
        <input
          className={inputBase}
          value={data.rx_id ?? ""}
          onChange={(e) => update({ rx_id: e.target.value })}
        />
      </label>

      <label className="text-sm">
        Extended Frame
        <select
          className={inputBase}
          value={data.extended ? "1" : "0"}
          onChange={(e) =>
            update({ extended: e.target.value === "1" })
          }
        >
          <option value="0">No</option>
          <option value="1">Sí</option>
        </select>
      </label>

    </div>
  );
}
