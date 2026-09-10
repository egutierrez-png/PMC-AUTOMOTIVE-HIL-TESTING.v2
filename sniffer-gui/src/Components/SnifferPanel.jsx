import { useState } from 'react';
import CanTable from './CanTable';
import LiveGraph from './LiveGraph';
import ParetoChart from './ParetoChart';
import HealthPanel from './HealthPanel';
import SettingsModal from './SettingsModal';
import { sendSnifferCommand } from '../mqtt/mqttClient';
import { loadConfig } from '../utils/configManager';

export default function SnifferPanel({ frames, connectionStatus, snifferActive, statusObj }) {
  const [view, setView] = useState('table'); // table | graph | pareto
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState(loadConfig());

  const renderView = () => {
    switch (view) {
      case 'graph':
        return <LiveGraph frames={frames} />;
      case 'pareto':
        return <ParetoChart frames={frames} />;
      default:
        return <CanTable frames={frames.slice(0, 500)} />;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* Health / status panel */}
      <div className="mb-3 flex justify-center">
        <HealthPanel statusObj={statusObj} />
      </div>

      {/* Toolbar superior */}
      <div className="flex flex-wrap justify-between items-center mb-3">
        {/* Selector de vista */}
        <div className="flex space-x-2">
          {['table', 'graph', 'pareto'].map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-4 py-2 rounded-lg font-semibold shadow-sm transition ${
                view === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {mode === 'table' && '🧾 Tabla'}
              {mode === 'graph' && '📈 Gráfica'}
              {mode === 'pareto' && '🧮 Pareto'}
            </button>
          ))}
        </div>

        {/* Controles Sniffer + Configuración */}
        <div className="flex space-x-2 items-center">
          <button
            onClick={() => sendSnifferCommand('sniffer_on')}
            className={`px-4 py-2 rounded-lg font-semibold transition shadow-sm ${
              snifferActive
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-green-100'
            }`}
          >
            🔵 Activar Sniffer
          </button>

          <button
            onClick={() => sendSnifferCommand('sniffer_off')}
            className={`px-4 py-2 rounded-lg font-semibold transition shadow-sm ${
              !snifferActive
                ? 'bg-gray-500 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ⚫ Desactivar
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg shadow-sm font-semibold"
          >
            ⚙️ Configuración
          </button>
        </div>
      </div>

      {/* Contenido dinámico */}
      <div className="flex-1">{renderView()}</div>

      {/* Barra de estado MQTT */}
      <div
        className={`flex items-center justify-center text-sm text-white mt-3 py-2 rounded-lg font-semibold shadow-inner ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-500'
            : connectionStatus === 'error'
            ? 'bg-red-500'
            : 'bg-gray-400'
        }`}
      >
        {connectionStatus === 'connected'
          ? 'Conectado'
          : connectionStatus === 'connecting'
          ? 'Conectando...'
          : connectionStatus === 'error'
          ? 'Error MQTT'
          : 'Desconectado'}
      </div>

      {/* Modal de configuración */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(newConf) => setConfig(newConf)}
      />
    </div>
  );
}
