export type ValueReadingItem = {
  label: string;
  valueText: string;
  ok: boolean | null;
};

function statusClass(ok: boolean | null): string {
  if (ok === true) return "text-green-400";
  if (ok === false) return "text-red-400";
  return "text-slate-300";
}

function statusText(ok: boolean | null): string {
  if (ok === true) return "PASS";
  if (ok === false) return "FAIL";
  return "N/D";
}

export default function ValueReadingsPanel({ items }: { items: ValueReadingItem[] }) {
  if (!items.length) return null;

  return (
    <div className="rounded border border-slate-700 p-2 bg-slate-900/40 mb-3">
      <div className="text-xs opacity-70 mb-2">Lecturas adicionales</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {items.map((item, idx) => (
          <div
            key={`${item.label}-${idx}`}
            className="rounded border border-slate-700 bg-slate-950/60 p-2 flex items-center justify-between gap-3"
          >
            <span className="opacity-70">{item.label}</span>
            <span className="font-mono">{item.valueText}</span>
            <span className={statusClass(item.ok)}>{statusText(item.ok)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}