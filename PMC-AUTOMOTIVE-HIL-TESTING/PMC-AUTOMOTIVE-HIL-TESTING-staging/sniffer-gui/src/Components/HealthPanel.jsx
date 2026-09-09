import React from 'react';

function formatTimestamp(ts) {
  if (!ts) return '—';
  // si viene en millis o en ISO, intentamos manejarlo
  const n = Number(ts);
  if (!isNaN(n) && n > 1e10) {
    // probablemente ms since epoch
    return new Date(n).toLocaleString();
  }
  // intenta parseo flexible
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toLocaleString();
  return String(ts);
}

export default function HealthPanel({ statusObj }) {
  // Campos esperados (puedes adaptar según lo que publique el firmware)
  const sniffer = statusObj?.sniffer_status ?? 'unknown';
  const connected = statusObj?.connected ?? null;
  const mode = statusObj?.test_mode ?? 'n/a';
  const timestamp = statusObj?.timestamp ?? statusObj?.ts ?? null;
  const extra = statusObj?.message ?? null; // si el firmware manda algún mensaje human

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 w-full max-w-3xl">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Estado general del EOL</h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-500">Sniffer</div>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                sniffer === 'on' ? 'bg-green-500' : sniffer === 'off' ? 'bg-gray-400' : 'bg-yellow-400'
              }`}
            />
            <div className="text-sm font-semibold">
              {sniffer === 'on' ? 'Activado' : sniffer === 'off' ? 'Desactivado' : 'Desconocido'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-500">Conectividad</div>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected === true ? 'bg-green-500' : connected === false ? 'bg-red-500' : 'bg-gray-400'
              }`}
            />
            <div className="text-sm font-semibold">
              {connected === true ? 'Online' : connected === false ? 'Offline' : 'No informado'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-500">Modo / Timestamp</div>
          <div className="mt-2">
            <div className="text-sm font-semibold">{String(mode)}</div>
            <div className="text-xs text-gray-500 mt-1">{formatTimestamp(timestamp)}</div>
          </div>
        </div>
      </div>

      {extra ? (
        <div className="mt-3 text-sm text-gray-600">
          {extra}
        </div>
      ) : null}
    </div>
  );
}
