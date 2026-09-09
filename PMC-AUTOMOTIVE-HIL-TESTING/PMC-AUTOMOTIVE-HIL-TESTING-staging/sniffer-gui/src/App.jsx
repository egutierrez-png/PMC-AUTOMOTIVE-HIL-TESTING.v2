import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { connectMqtt } from './mqtt/mqttClient';
import SnifferPanel from './Components/SnifferPanel.jsx';
import Toast from './Components/Toast.jsx';


function App() {
  const [frames, setFrames] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [snifferActive, setSnifferActive] = useState(false);
  const [statusObj, setStatusObj] = useState(null);
  const [toast, setToast] = useState(null); // 👈 nuevo

  useEffect(() => {
    const client = connectMqtt(
      (data) => setFrames((prev) => [data, ...prev.slice(0, 1000)]),
      setStatus,
      // onSnifferStatus (compat)
      (snifferStatus) => {
        const active = snifferStatus === 'on';
        if (active !== snifferActive) showToast(active);
        setSnifferActive(active);
      },
      // onGeneralStatus
      (obj) => {
        setStatusObj(obj);
        if (obj.sniffer_status) {
          const active = obj.sniffer_status === 'on';
          if (active !== snifferActive) showToast(active);
          setSnifferActive(active);
        }
      }
    );

    return () => client && client.end();
  }, [snifferActive]);

  const showToast = (active) => {
    const msg = active ? '✅ Sniffer activado' : '🛑 Sniffer desactivado';
    setToast({ message: msg, type: active ? 'success' : 'error' });
  };

  return (
    <div className="bg-gray-100 h-screen flex flex-col">
      <header className="p-3 bg-blue-600 text-white font-bold text-lg shadow">
        PMC Sniffer GUI (MQTT)
      </header>

      <SnifferPanel
        frames={frames}
        connectionStatus={status}
        snifferActive={snifferActive}
        statusObj={statusObj}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App
