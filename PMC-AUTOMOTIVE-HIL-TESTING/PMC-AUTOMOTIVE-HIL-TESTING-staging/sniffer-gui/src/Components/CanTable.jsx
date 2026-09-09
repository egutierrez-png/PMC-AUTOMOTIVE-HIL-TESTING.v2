export default function CanTable({ frames }) {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-3 h-full">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Tramas CAN (últimas 500)</h3>
      <div className="overflow-y-auto" style={{ height: '360px' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-100 text-gray-700 border-b border-gray-300">
            <tr>
              <th className="p-2 text-left font-semibold">ID</th>
              <th className="p-2 text-center font-semibold">DLC</th>
              <th className="p-2 text-left font-semibold">DATA</th>
              <th className="p-2 text-left font-semibold">TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {frames.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-400">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              frames.map((f, i) => (
                <tr
                  key={i}
                  className="hover:bg-blue-50 border-b border-gray-100 transition"
                >
                  <td className="p-2 font-mono">{f.id}</td>
                  <td className="p-2 text-center">{f.dlc}</td>
                  <td className="p-2 font-mono text-blue-700">{f.data}</td>
                  <td className="p-2 text-gray-600">
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
