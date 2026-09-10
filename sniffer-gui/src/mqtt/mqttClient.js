import mqtt from 'mqtt';
import { loadConfig } from '../utils/configManager';

let clientInstance = null;
let reconnectTimer = null;
let isManualDisconnect = false;

/**
 * Conecta al broker MQTT usando la configuración local, con auto-reintento.
 */
export function connectMqtt(onMessage, onStatusChange, onSnifferStatus, onGeneralStatus) {
  const config = loadConfig();

  const brokerURL = `mqtt://${config.brokerHost}:${config.brokerPort}`;
  const options = {
    reconnectPeriod: 0, // manejamos reconexión manualmente
    keepalive: 20,
  };

  if (config.username && config.password) {
    options.username = config.username;
    options.password = config.password;
  }

  console.log(`🔌 Intentando conectar a ${brokerURL}...`);
  onStatusChange('connecting');

  const client = mqtt.connect(brokerURL, options);
  clientInstance = client;
  isManualDisconnect = false;

  // ---------- EVENTOS ----------
  client.on('connect', () => {
    console.log(`✅ Conectado a ${brokerURL}`);
    clearTimeout(reconnectTimer);
    onStatusChange('connected');

    // Suscribirse a los tópicos definidos
    const { frames, status } = config.topics;
    client.subscribe(frames, { qos: 0 });
    client.subscribe(status, { qos: 0 });
  });

  client.on('message', (topic, message) => {
    const msg = message.toString();
    try {
      const { frames, status } = config.topics;

      if (topic === status) {
        let parsed;
        try {
          parsed = JSON.parse(msg);
        } catch {
          console.warn('⚠️ Payload no es JSON válido:', msg);
        }

        if (parsed) {
          if (parsed.sniffer_status && typeof onSnifferStatus === 'function') {
            onSnifferStatus(parsed.sniffer_status);
          }
          if (typeof onGeneralStatus === 'function') {
            onGeneralStatus(parsed);
          }
        }
        return;
      }

      if (topic === frames) {
        const data = JSON.parse(msg);
        onMessage(data);
      }
    } catch (err) {
      console.error('❌ Error procesando mensaje MQTT:', err, msg);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT error:', err?.message || err);
    onStatusChange('error');
    scheduleReconnect(onMessage, onStatusChange, onSnifferStatus, onGeneralStatus);
  });

  client.on('close', () => {
    if (!isManualDisconnect) {
      console.warn('⚠️ Conexión MQTT cerrada, intentando reconectar...');
      onStatusChange('reconnecting');
      scheduleReconnect(onMessage, onStatusChange, onSnifferStatus, onGeneralStatus);
    } else {
      console.log('🔌 Desconexión manual');
      onStatusChange('disconnected');
    }
  });

  return client;
}

/**
 * Programa un reintento de conexión en 5 segundos.
 */
function scheduleReconnect(onMessage, onStatusChange, onSnifferStatus, onGeneralStatus) {
  if (reconnectTimer) return; // evita duplicados

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log('🔁 Reintentando conexión MQTT...');
    connectMqtt(onMessage, onStatusChange, onSnifferStatus, onGeneralStatus);
  }, 5000);
}

/**
 * Cierra la conexión MQTT y cancela el auto-reintento.
 */
export function disconnectMqtt() {
  isManualDisconnect = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (clientInstance) {
    clientInstance.end(true);
    console.log('🔌 MQTT desconectado manualmente.');
  }
}

/**
 * Envía un comando MQTT al topic configurado.
 * (Ejemplo: "sniffer_on" o "sniffer_off")
 */
export function sendSnifferCommand(command) {
  const config = loadConfig();

  if (!clientInstance || !clientInstance.connected) {
    console.warn('⚠️ Cliente MQTT no conectado, no se puede enviar comando.');
    return;
  }

  const topic = config.topics.command || 'pmc/commands';
  clientInstance.publish(topic, command);
  console.log(`📡 Enviado comando "${command}" → ${topic}`);
}
