import React from "react";
import { Panel } from "./Panel";

export default function ParamsPanel() {
  return (
    <Panel title="Entradas / Salidas analógicas">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-800 p-3 rounded-xl">
          <div className="opacity-80">Input Voltage</div>
          <div className="text-2xl font-bold">13.5 V</div>
        </div>

        <div className="bg-slate-800 p-3 rounded-xl">
          <div className="opacity-80">Ambient Temp</div>
          <div className="text-2xl font-bold">25.0 °C</div>
        </div>
      </div>

      {/* Telemetría real después si lo deseas */}
    </Panel>
  );
}
