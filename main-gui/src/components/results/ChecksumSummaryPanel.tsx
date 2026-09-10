type ChecksumSummaryPanelProps = {
  checksumValue?: string | number | null;
  checksumOk?: boolean | null;
  failsafeLabel?: string;
  failsafeOk?: boolean | null;
};

function statusClass(ok: boolean | null | undefined): string {
  if (ok === true) return "text-green-400";
  if (ok === false) return "text-red-400";
  return "text-slate-300";
}

function statusText(ok: boolean | null | undefined): string {
  if (ok === true) return "PASS";
  if (ok === false) return "FAIL";
  return "N/D";
}

export default function ChecksumSummaryPanel({
  checksumValue,
  checksumOk,
  failsafeLabel,
  failsafeOk,
}: ChecksumSummaryPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-xs">
      <div className="rounded border border-slate-700 p-2 bg-slate-900/40">
        <div className="opacity-70 mb-1">Checksum</div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono truncate">
            {checksumValue !== undefined && checksumValue !== null
              ? String(checksumValue)
              : "N/D"}
          </span>
          <span className={statusClass(checksumOk)}>{statusText(checksumOk)}</span>
        </div>
      </div>

      <div className="rounded border border-slate-700 p-2 bg-slate-900/40">
        <div className="opacity-70 mb-1">Failsafe</div>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{failsafeLabel || "N/D"}</span>
          <span className={statusClass(failsafeOk)}>{statusText(failsafeOk)}</span>
        </div>
      </div>
    </div>
  );
}
