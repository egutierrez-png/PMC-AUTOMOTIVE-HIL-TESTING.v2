🧭 Firmware de Prueba de Actuador – Portenta Machine Control (PMC)
📘 Descripción general

Este firmware controla el equipo de prueba de actuadores automotrices, diseñado para comunicarse con diferentes familias (VTG, WG, V134, I326, etc.) por medio de CAN o UART, ejecutar secuencias de prueba (“recetas”) definidas en JSON y reportar resultados a Ignition Edge Panel vía MQTT.

La lógica está completamente modularizada para escalar entre familias y protocolos sin reprogramar el firmware base.

⚙️ Arquitectura general
Ignition Edge (HMI)
        ↓ MQTT (Jobs JSON)
Mosquitto / Ignition Broker
        ↓
Portenta Machine Control (PMC)
 ├── mqtt_client      ← Comunicación MQTT
 ├── test_engine      ← Intérprete de recetas
 ├── primitives       ← Acciones básicas (movimientos, flags, etc.)
 ├── can_transport    ← Comunicación CAN
 └── uart_transport   ← Comunicación UART


Ignition Edge publica una receta (job JSON) → actuator/test/jobs.

PMC ejecuta los pasos y devuelve progreso y resultados:

actuator/test/status/<serial>

actuator/test/results/<serial>

actuator/test/heartbeat

🗂️ Estructura de carpetas
pmc-firmware/
├─ src/
│  ├─ main.cpp
│  ├─ config.h
│  ├─ mqtt/
│  │  ├─ mqtt_client.cpp / .h
│  ├─ protocol/
│  │  ├─ i_transport.h
│  │  ├─ can_transport.cpp / .h
│  │  ├─ uart_transport.cpp / .h
│  ├─ engine/
│  │  ├─ primitives.cpp / .h
│  │  ├─ recipe_types.h
│  │  ├─ test_engine.cpp / .h
│  ├─ utils/
│  │  ├─ json_utils.cpp / .h
│  └─ platform/
│     ├─ hw_pins.h
│     └─ watchdog.cpp
├─ platformio.ini  (o arduino-cli.json)
└─ README.md

🔧 Dependencias

Instalar desde el Arduino Library Manager o platformio.ini:

Librería	Propósito
PubSubClient	Comunicación MQTT
ArduinoJson	Parseo y construcción de JSON
Arduino_CAN	Comunicación CAN nativa
Ethernet / WiFiNINA	Conectividad a red
(opcional) ArduinoRS485	Para futuras expansiones

Si usas PlatformIO, asegúrate de ajustar build_flags = -DMQTT_MAX_PACKET_SIZE=2048

🧱 Configuración del sistema – src/config.h

Aquí defines los parámetros generales de red, protocolos, modo de simulación y velocidades de bus.

#define CONFIG_BROKER_IP      "192.168.1.100"
#define CONFIG_BROKER_PORT    1883
#define CONFIG_CLIENT_ID      "PMC_Station_01"

#define USE_CAN               1        // 1 = CAN, 0 = UART
#define CAN_BAUDRATE          500000
#define UART_BAUDRATE         115200
#define SIMULATION_MODE       1        // 1 = sin hardware, 0 = real


💡 Al cambiar USE_CAN a 0, el firmware automáticamente usa UARTTransport.

🧩 Flujo lógico de ejecución

Ignition publica un job en actuator/test/jobs con una receta JSON.

mqtt_client recibe el mensaje → lo entrega al test_engine.

test_engine interpreta cada paso (action) y ejecuta la primitive correspondiente.

primitives traduce la acción en frames CAN o UART usando ITransport.

can_transport / uart_transport envía y recibe los mensajes físicos.

El resultado se acumula y se publica a results/<serial> cuando finaliza.

🧠 Dónde definir mensajes, IDs y protocolos específicos
1️⃣ Si es CAN (protocolo automotriz)

Todos los CAN IDs, PIDs, bytes de comando y secuencias de datos específicos por familia se definen en:

📍 src/engine/primitives.cpp

Dentro de cada método:

// Ejemplo:
f.id = 0x7E0;               // ID de transmisión al actuador
f.data[0] = 0x22;           // Servicio UDS: ReadDataByIdentifier
f.data[1] = pidMajor;       // PID alto
f.data[2] = pidMinor;       // PID bajo


👉 Cada familia puede tener su propio formato:

Puedes crear tablas o funciones auxiliares (vtg_messages.h, wg_messages.h, etc.) con los valores y bytes correspondientes.

Basta con incluirlas en primitives.cpp y seleccionar según la familia actual (recipe.family o similar).

2️⃣ Si es UART (protocolo ASCII o binario)

Los formatos y tramas específicas se colocan en:

📍 src/protocol/uart_transport.cpp

En los métodos send() y receive():

// Ejemplo (familia UART tipo binario simple)
_serial.write(0xAA);      // STX
_serial.write(cmd);       // Comando (e.g. MOVE_POS)
_serial.write(position);  // Valor
_serial.write(checksum);  // CRC simple


Cada familia UART puede usar diferente estructura:
puedes crear uart_v134.cpp, uart_i326.cpp si el formato varía, todos heredando de ITransport.

3️⃣ Parámetros y límites por prueba

Todos los límites y tiempos de validación (response time, posición final, etc.) vienen desde la receta JSON enviada por Ignition y son interpretados en:

📍 src/utils/json_utils.cpp
📍 src/engine/test_engine.cpp

Ejemplo en JSON:

{
  "action": "motor_off",
  "parameters": { "pid": "43.7" },
  "expect": { "final_position_less_than": 5, "timeout_ms": 5000 }
}

🧰 Modo Simulación

Definido en config.h:

#define SIMULATION_MODE 1


En este modo:

Las primitives devuelven resultados aleatorios simulados.

No se usa hardware real (CAN ni UART).

Ideal para probar comunicación MQTT e integración con Ignition.

🚀 Compilación y despliegue
🔹 Usando Arduino IDE

Instalar dependencias desde Library Manager.

Seleccionar placa Portenta H7 (Machine Control).

Abrir src/main.cpp.

Compilar y subir.

🔹 Usando PlatformIO
[env:portenta_h7]
platform = ststm32
board = portenta_h7_m7
framework = arduino
lib_deps =
  knolleary/PubSubClient
  bblanchon/ArduinoJson
  arduino-libraries/Arduino_CAN
  arduino-libraries/Ethernet
build_flags = -DMQTT_MAX_PACKET_SIZE=2048

📡 MQTT Topics definidos
Dirección	Topic	Descripción
Ignition → PMC	actuator/test/jobs	Envía receta JSON (job).
PMC → Ignition	actuator/test/status/<serial>	Estado actual del test.
PMC → Ignition	actuator/test/results/<serial>	Resultados por paso.
PMC → Ignition	actuator/test/heartbeat	Señal de vida cada 10 s.
📊 Ejemplo de ciclo completo

1️⃣ Ignition publica un job JSON:

{
  "job_id": "WG_Failsafe_001",
  "serial_number": "ACT23456",
  "sequence": [
    {"action": "command_position", "parameters": {"position": 100}},
    {"action": "motor_off", "expect": {"final_position_less_than": 2, "timeout_ms": 1000}}
  ]
}


2️⃣ PMC lo recibe, ejecuta, y devuelve:

{
  "job_id": "WG_Failsafe_001",
  "serial_number": "ACT23456",
  "results": [
    {"step": 1, "measured_position": 100, "response_time_ms": 210, "status": "PASS"},
    {"step": 2, "measured_position": 1, "response_time_ms": 700, "status": "PASS"}
  ],
  "overall": "PASS"
}

🧩 Extender a nuevas familias

Cuando se agregue una nueva familia de actuadores:

Crear un nuevo archivo de mensajes en src/engine/families/<FAMILY>_defs.h.

namespace VTG {
  const uint16_t CMD_MOVE_POS = 0x7E0;
  const uint8_t PID_LEARN = 0x43;
  // ...
}


Modificar primitives.cpp para incluir los headers según recipe.family.

Actualizar la base de datos SQLite en Ignition con las nuevas recetas.

🔑 Nunca se modifica el firmware principal.
Solo se agregan los mapas de mensajes específicos y se cargan nuevas recetas JSON.

✅ Ventajas de esta arquitectura

Escalable: múltiples protocolos y familias sin recompilar núcleo.

Modular: cada capa (MQTT / Engine / Transport) es independiente.

Segura: comunicación asincrónica vía MQTT.

Debuggable: modo simulación, logs seriales detallados.

Reutilizable: los mismos primitives servirán para pruebas CAN o UART.

🧩 Próximas expansiones sugeridas

Integración con SD / SQLite local para trazabilidad offline.

Implementación de auto-detección de protocolo según arnés conectado.

Inclusión de test profiles cargados dinámicamente desde Ignition.

Control de alimentación de actuador (relé de alimentación) desde hw_pins.h.

👷‍♂️ Mantenimiento

Versiona el firmware por commit (Git tag = versión de software EOL).

Documenta los DBC/A2L asociados en /docs/ (uno por familia).

Siempre probar en modo simulación antes de liberar builds reales.