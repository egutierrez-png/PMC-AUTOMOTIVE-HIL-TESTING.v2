import { Panel } from "../Panel";
import SignalsChart from "./SignalsChart";
import SignalsConfigPanel from "./SignalsConfigPanel";

export default function SignalsDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

      {/* Config panel */}
      <div className="col-span-1 flex flex-col gap-4">
        <SignalsConfigPanel />
      </div>

      {/* Chart */}
      <div className="col-span-3 flex flex-col gap-4">
        <Panel title="Señales en vivo">
          <SignalsChart />
        </Panel>
      </div>

    </div>
  );
}
