type Props = {
  data: {
    baudrate?: number;
    databits?: 7 | 8;
    parity?: "none" | "even" | "odd";
    stopbits?: 1 | 2;
  };
  onChange: (next: any) => void;
};

export default function ProfileUARTForm({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  // Estilos consistentes
  const inputBase =
    "w-full rounded px-3 py-2 mt-1 transition " +
    "bg-slate-100 text-slate-800 border border-slate-300 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 " +
    "focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <div className="space-y-3">

      {/* BAUDRATE */}
      <label className="text-sm">
        Baudrate
        <input
          type="number"
          className={inputBase}
          value={data.baudrate ?? 115200}
          onChange={(e) => update({ baudrate: Number(e.target.value) })}
        />
      </label>

      {/* DATA BITS */}
      <label className="text-sm">
        Data Bits
        <select
          className={inputBase}
          value={data.databits ?? 8}
          onChange={(e) =>
            update({ databits: Number(e.target.value) as 7 | 8 })
          }
        >
          <option value={7}>7</option>
          <option value={8}>8</option>
        </select>
      </label>

      {/* PARITY */}
      <label className="text-sm">
        Parity
        <select
          className={inputBase}
          value={data.parity ?? "none"}
          onChange={(e) =>
            update({ parity: e.target.value as "none" | "even" | "odd" })
          }
        >
          <option value="none">None</option>
          <option value="even">Even</option>
          <option value="odd">Odd</option>
        </select>
      </label>

      {/* STOP BITS */}
      <label className="text-sm">
        Stop Bits
        <select
          className={inputBase}
          value={data.stopbits ?? 1}
          onChange={(e) =>
            update({ stopbits: Number(e.target.value) as 1 | 2 })
          }
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </label>

    </div>
  );
}
