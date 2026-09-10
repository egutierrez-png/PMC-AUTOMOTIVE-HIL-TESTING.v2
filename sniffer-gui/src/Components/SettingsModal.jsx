import React, { useState } from 'react';
import { loadConfig, saveConfig } from '../utils/configManager';

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [form, setForm] = useState(loadConfig());

  const [creds, setCreds] = useState({ user: '', pass: '' });
  const validUser = 'admin';
  const validPass = 'pmc2025';

  if (!isOpen) return null;

  const handleLogin = () => {
    if (creds.user === validUser && creds.pass === validPass) {
      setLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleSave = () => {
    saveConfig(form);
    onSave(form);
    onClose();
  };

  const handleChange = (path, value) => {
    const parts = path.split('.');
    setForm((prev) => {
      const updated = { ...prev };
      let obj = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] rounded-xl shadow-lg p-5">
        {!loggedIn ? (
          <>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">🔒 Iniciar sesión</h3>
            <input
              type="text"
              placeholder="Usuario"
              value={creds.user}
              onChange={(e) => setCreds({ ...creds, user: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-2 text-sm"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={creds.pass}
              onChange={(e) => setCreds({ ...creds, pass: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-2 text-sm"
            />
            {loginError && <div className="text-red-500 text-xs mb-2">{loginError}</div>}
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded-lg font-semibold"
            >
              Entrar
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">⚙️ Configuración MQTT</h3>

            <div className="space-y-2 text-sm">
              <div>
                <label>Broker Host</label>
                <input
                  type="text"
                  value={form.brokerHost}
                  onChange={(e) => handleChange('brokerHost', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label>Puerto</label>
                <input
                  type="number"
                  value={form.brokerPort}
                  onChange={(e) => handleChange('brokerPort', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label>Usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label>Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <hr />
              <h4 className="text-gray-600 font-semibold mt-3">Tópicos</h4>
              {Object.keys(form.topics).map((key) => (
                <div key={key}>
                  <label className="capitalize">{key}</label>
                  <input
                    type="text"
                    value={form.topics[key]}
                    onChange={(e) => handleChange(`topics.${key}`, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={onClose}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Guardar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
