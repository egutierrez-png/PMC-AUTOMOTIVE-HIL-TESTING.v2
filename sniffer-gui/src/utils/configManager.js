export const DEFAULT_CONFIG = {
  brokerHost: '192.168.1.50',
  brokerPort: 1883,
  username: '',
  password: '',
  topics: {
    command: 'pmc/commands',
    frames: 'pmc/sniffer/can_raw',
    status: 'pmc/EOL01/status'
  }
};

const STORAGE_KEY = 'pmc_sniffer_config_v1';

export function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
  } catch (e) {
    console.error('Error cargando configuración:', e);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error guardando configuración:', e);
  }
}
