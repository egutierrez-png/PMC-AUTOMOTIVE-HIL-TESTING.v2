export type MechanicalResultItem = {
  stepLabel: string;
  measuredPosition: number | null;
  lowerLimit: number | null;
  upperLimit: number | null;
  inRange: boolean | null;
};

type MechanicalResultsPanelProps = {
  items: MechanicalResultItem[];
};

function fmt(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "N/D";
  return String(v);
}

export default function MechanicalResultsPanel({ items }: MechanicalResultsPanelProps) {
  return (
    <div className="rounded border border-slate-700 p-2 bg-slate-900/40 mb-3">
      <div className="text-xs opacity-70 mb-2">
        Resultado mecanico (measured_position vs limites)
      </div>

      {!items.length && (
        <div className="text-xs opacity-70">Sin resultados mecanicos aun</div>
      )}

      {!!items.length && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={`${item.stepLabel}-${idx}`}
              className="rounded border border-slate-700/70 p-2"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold">{item.stepLabel}</span>
                <span
                  className={`text-xs font-semibold ${
                    item.inRange === true
                      ? "text-green-400"
                      : item.inRange === false
                      ? "text-red-400"
                      : "text-slate-300"
                  }`}
                >
                  {item.inRange === true ? "PASS" : item.inRange === false ? "FAIL" : "N/D"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
                  <div className="opacity-60 mb-1">Limite inferior</div>
                  <div className="font-mono text-lg leading-tight">{fmt(item.lowerLimit)}</div>
                </div>

                <div className="rounded border border-slate-600 bg-slate-950 p-2">
                  <div className="opacity-70 mb-1">Valor actual</div>
                  <div
                  className={
                    item.inRange === true
                      ? "font-mono text-2xl leading-tight text-green-400"
                      : item.inRange === false
                      ? "font-mono text-2xl leading-tight text-red-400"
                      : "font-mono text-2xl leading-tight text-slate-200"
                  }
                >
                    {fmt(item.measuredPosition)}
                  </div>
                </div>

                <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
                  <div className="opacity-60 mb-1">Limite superior</div>
                  <div className="font-mono text-lg leading-tight">{fmt(item.upperLimit)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
