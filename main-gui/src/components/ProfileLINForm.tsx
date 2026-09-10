type Props = {
  data: {
    baudrate?: number;
    master?: boolean;
    frame_id?: string;
  };
  onChange: (next: any) => void;
};

export default function ProfileLINForm({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  return (
    <div className="space-y-3">

      {/* Baudrate */}
      <label className="text-sm">
        <span className="opacity-70">Baudrate</span>
        <input
          type="number"
          className="
            w-full rounded px-3 py-2 mt-1 transition
            bg-slate-100 text-slate-800 border border-slate-300
            focus:border-accent focus:ring-1 focus:ring-accent

            dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
            dark:focus:border-accent dark:focus:ring-accent
          "
          value={data.baudrate ?? 19200}
          onChange={(e) => update({ baudrate: Number(e.target.value) })}
        />
      </label>

      {/* Master Mode */}
      <label className="text-sm">
        <span className="opacity-70">Master Mode</span>
        <select
          className="
            w-full rounded px-3 py-2 mt-1 transition
            bg-slate-100 text-slate-800 border border-slate-300
            focus:border-accent focus:ring-1 focus:ring-accent

            dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
            dark:focus:border-accent dark:focus:ring-accent
          "
          value={data.master ? "1" : "0"}
          onChange={(e) => update({ master: e.target.value === "1" })}
        >
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      </label>

      {/* Frame ID */}
      <label className="text-sm">
        <span className="opacity-70">Frame ID</span>
        <input
          className="
            w-full rounded px-3 py-2 mt-1 transition
            bg-slate-100 text-slate-800 border border-slate-300
            focus:border-accent focus:ring-1 focus:ring-accent

            dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
            dark:focus:border-accent dark:focus:ring-accent
          "
          value={data.frame_id ?? ""}
          onChange={(e) => update({ frame_id: e.target.value })}
        />
      </label>

    </div>
  );
}
