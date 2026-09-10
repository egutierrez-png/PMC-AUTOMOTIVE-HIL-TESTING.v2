import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ParetoChart({ frames }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // contar ocurrencias por ID
    const counts = {};
    frames.forEach(f => {
      counts[f.id] = (counts[f.id] || 0) + 1;
    });

    // ordenar descendente por frecuencia
    const sorted = Object.entries(counts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 IDs

    setData(sorted);
  }, [frames]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Top 10 IDs más frecuentes</h3>
      {data.length === 0 ? (
        <div className="text-center text-gray-400 mt-10">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="id" type="category" width={100} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
