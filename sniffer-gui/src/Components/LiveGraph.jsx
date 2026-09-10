import { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function LiveGraph({ frames }) {
  const [data, setData] = useState([]);
  const counterRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    counterRef.current += 1;
  }, [frames]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setData(prev => {
        const now = new Date().toLocaleTimeString();
        const updated = [...prev, { time: now, frames: counterRef.current }];
        counterRef.current = 0;
        if (updated.length > 20) updated.shift(); // solo muestra los últimos 20 segundos
        return updated;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Actividad CAN (frames/s)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="frames" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
