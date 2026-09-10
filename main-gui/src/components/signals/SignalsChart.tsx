import ReactEcharts from "echarts-for-react";
import { useSignalsStore } from "../../state/useSignalsStore";

export default function SignalsChart() {
  const { selectedSignals, data } = useSignalsStore();

  const series = selectedSignals.map(sig => ({
    name: sig,
    type: "line",
    showSymbol: false,
    data: data[sig]?.map(p => [p.t, p.v]) ?? [],
    lineStyle: { width: 2 }
  }));

  const option = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value" },
    series,
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    animation: false
  };

  return (
    <div className="w-full h-[400px]">
      <ReactEcharts option={option} style={{ height: "100%" }} />
    </div>
  );
}
