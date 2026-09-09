# PMC Bridge – README

## Descripción general

**PMC Bridge** es un servicio intermedio (gateway) que conecta:

* **Ignition Edge Panel** (HMI)
* **Node.js**
* **MQTT Broker** (Mosquitto / Ignition)
* **PMC (Portenta Machine Control)**

El objetivo es permitir:

* **Comandos de la HMI → PMC**
* **Resultados y estado del PMC → HMI**

Todo sin usar WebDev ni módulos MQTT de Ignition, apoyándose únicamente en:

* `system.net.httpPost()` en Ignition
* `mqtt.js` para conectarse al broker
* `node-opcua` para escribir tags en Ignition

---

## Arquitectura

```
   Ignition Edge Panel
         │  (HTTP POST)
         ▼
   Node.js Bridge (Express)
         │  (MQTT Publish)
         ▼
          PMC
         ▲
         │  (MQTT Results, Status, Heartbeat)
   Node.js Bridge (mqtt.js)
         │  (OPC-UA Write)
         ▼
   Ignition OPC-UA Server ← Tags visibles en la HMI
```

---

## Estructura del proyecto

```
pmc-bridge/
  ├── package.json
  ├── server.js
  └── opcua.js
```

---

## Instalación

### 1. Clonar o copiar el proyecto

```bash
git clone https://github.com/tu-org/pmc-bridge.git
cd pmc-bridge
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la IP del broker MQTT

En `server.js`:

```js
const MQTT_BROKER = "mqtt://192.168.1.105:1883";
```

### 4. Levantar el servicio

```bash
npm start
```

Salida esperada:

```
MQTT connected to mqtt://192.168.1.105:1883
MQTT subscribed: actuator/test/results/#, actuator/test/status/#, actuator/test/heartbeat
Bridge running on http://localhost:3000
```

---

## Tags necesarios en Ignition

Crear en Ignition (dentro del OPC-UA Server) la siguiente estructura:

```
PMC/
 ├── Status (String)
 ├── Heartbeat (String)
 └── Results/
       └── LastResult (String)
```

Node.js escribirá directamente en estos tags.

---

## Cómo enviar comandos desde Ignition

En un botón de Perspective o Vision:

```python
system.net.httpPost(
    "http://localhost:3000/api/pmc/cmd",
    "application/json",
    system.util.jsonEncode({
        "command": "abort_test"
    })
)
```

Otros comandos:

```python
{"command": "ping"}
{"command": "reset"}
{"command": "sniffer_on", "bitrate": 500000}
{"command": "sniffer_off"}
{"command": "set_config", "protocol": "CAN", "can_baudrate": 500000}
```

---

## Cómo recibe datos Ignition

Cuando el PMC publica algo por MQTT, Node.js lo recibe y lo escribe a los tags:

* `actuator/test/results/<serial>` → `PMC/Results/LastResult`
* `actuator/test/status/<serial>` → `PMC/Status`
* `actuator/test/heartbeat` → `PMC/Heartbeat`

Ignition actualiza automáticamente las pantallas y scripts.

---

## Endpoints del Bridge

### POST `/api/pmc/cmd`

Envia un comando al PMC vía MQTT.

**Body JSON:**

```json
{
  "command": "abort_test"
}
```

**Respuesta:**

```json
{
  "ok": true,
  "published": { "command": "abort_test" }
}
```

---

## Archivos principales

### `server.js`

* Conecta a MQTT
* Maneja comandos desde Ignition
* Escribe resultados vía OPC-UA
* Corre el servidor HTTP

### `opcua.js`

* Implementa un cliente OPC-UA minimal para escribir tags en Ignition

---

## Debugging

### 1. Ver si Node recibe mensajes MQTT

```
MQTT connected
MESSAGE: actuator/test/results/EOL01 {...}
```

### 2. Ver si OPC-UA está escribiendo

```
OPC-UA: tag updated: ns=1;s=PMC/Results/LastResult
```

### 3. Ver si Ignition actualiza tags

Abrir Tag Browser → folder PMC → verificar valores.

---

## Requerimientos

### En el Bridge:

* Node.js 18+
* mqtt.js
* express
* node-opcua

### En Ignition:

* Ignition Edge Panel 8.3+
* OPC-UA Server habilitado
* OPC-UA Security = None (para entorno local/test)

---

## Seguridad (Recomendado)

Para entornos productivos:

* Habilitar usuario/contraseña en Mosquitto
* Forzar TLS en 8883
* Restringir el OPC-UA server a localhost
* Poner autenticación básica en el HTTP bridge
* Aislar el panel PC en VLAN industrial

---

## Estado del proyecto

Producción-ready para flujos EOL, pruebas automáticas, HMI interactivas y líneas de manufactura.

---

## Soporte

Si necesitas extender esta arquitectura con:

* Docker
* Historian
* Dashboards adicionales
* Integración con base de datos (MySQL / TimescaleDB)
* Mejoras en seguridad

Puedo ayudarte a construirlo.
