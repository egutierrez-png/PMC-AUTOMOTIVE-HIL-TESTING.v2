import { Panel } from "./Panel";

export const AnalogPanel = ({ className = "" }) => (
  <Panel title="Analog Inputs / Outputs" className={className}>
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="bg-slate-800 rounded-xl p-3 shadow-inner">
        <div className="text-xs opacity-60">Input Voltage</div>
        <div className="text-2xl font-bold text-accent">13.5 V</div>
      </div>
      <div className="bg-slate-800 rounded-xl p-3 shadow-inner">
        <div className="text-xs opacity-60">Ambient Temp</div>
        <div className="text-2xl font-bold text-amber-400">25.0 °C</div>
      </div>
    </div>
  </Panel>
);
