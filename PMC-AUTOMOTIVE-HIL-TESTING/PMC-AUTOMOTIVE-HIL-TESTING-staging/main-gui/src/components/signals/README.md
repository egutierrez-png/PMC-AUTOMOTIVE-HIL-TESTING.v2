📘 README — Cómo agregar nuevas señales al sistema (defaultSignalMap)

Este documento explica cómo extender el sistema de señales agregando nuevos elementos al archivo defaultSignalMap.
Estas señales alimentan el Signals Dashboard, permitiendo graficar valores provenientes de:

STATUS (estado en tiempo real)

RESULTS (resultados por step)

CAN (frames de datos crudos)

UART (cuando exista un topic para ello)

El sistema está diseñado para ser escalable, multi-dispositivo y multi-protocolo, sin necesidad de modificar la UI ni los parsers.

🧩 1. Ubicación del archivo

El archivo que debes editar es:

src/signals/registry/defaultMap.ts


Aquí defines TODAS las señales que el sistema puede graficar.

🟦 2. Señales provenientes de STATUS

Topic: pmc/{station}/status

Ejemplo de STATUS:

{
  "current_step": 8,
  "motor": { "current_A": 2.5 }
}

➕ Agregar una señal desde STATUS
{
  name: "motor_current_A",
  source: "STATUS",
  path: "motor.current_A",
  scale: 1
}


Reglas:

Campo	Descripción
name	Nombre interno de la señal (aparece en UI)
source	"STATUS"
path	Ruta dentro del JSON (usa puntos)
scale	Multiplicador opcional
🟧 3. Señales provenientes de RESULTS

Topic: pmc/{station}/results

Ejemplo dentro del arreglo results[]:

{
  "measured_position": 120,
  "response_time_ms": 350
}

➕ Agregar señal desde RESULTS
{
  name: "response_time_ms",
  source: "RESULTS",
  path: "response_time_ms",
  scale: 1
}


Reglas:

El parser recorre automáticamente todos los elementos de results[].

path es relativo al objeto de cada step.

🟥 4. Señales provenientes de CAN

Topic: pmc/{station}/log/raw_can

Formato usual del PMC:

{
  "id": 419371005,
  "data": [12, 34, 56, 78, 90, 0]
}

➕ Agregar señal desde CAN
{
  name: "torque_Nm",
  source: "CAN",
  frameId: 0x18FF50E5,
  byteOffset: 2,
  length: 2,
  type: "uint16",
  scale: 0.1
}


Campos obligatorios para señales CAN:

Campo	Descripción
frameId	ID del frame CAN
byteOffset	Byte inicial dentro de data[]
length	1, 2 o 4 bytes
type	uint8, uint16, int16, float
scale	Multiplicador final
🟪 5. Señales convertidas (ej. PASS/FAIL → 1/0)
STATUS como bandera:
{
  name: "status_flag",
  source: "STATUS",
  path: "status"
}


El parser convierte:

RUNNING → 1
IDLE / PASS / FAIL → 0

RESULTS como bandera:
{
  name: "result_status_flag",
  source: "RESULTS",
  path: "status"
}


El parser convierte:

PASS → 1
FAIL → 0

🧪 6. Ejemplos comunes
Corriente:
{ 
  name: "motor_current_A", 
  source: "STATUS", 
  path: "motor.current_A" 
}

Posición desde CAN:
{
  name: "position_deg",
  source: "CAN",
  frameId: 0x120,
  byteOffset: 0,
  length: 2,
  type: "uint16",
  scale: 0.1
}

Torque:
{
  name: "torque_Nm",
  source: "CAN",
  frameId: 0x18FF50E5,
  byteOffset: 4,
  length: 2,
  type: "int16",
  scale: 0.01
}

Temperatura:
{
  name: "temperature_C",
  source: "RESULTS",
  path: "temperature_C"
}

⚙️ 7. Checklist antes de agregar una señal

✔ ¿De qué fuente viene? (STATUS, RESULTS, CAN)
✔ ¿Conoces la ruta JSON (path) o el byte dentro del frame?
✔ ¿Es numérica? Si no, piensa si debe convertirse a flag.
✔ ¿Necesita escala? (scale)
✔ ¿Aparece en el SignalsConfigPanel?
✔ ¿Se grafica correctamente?
✔ ¿No duplicaste el name?

🧱 8. Qué NO debes modificar

No es necesario tocar:

❌ UI del SignalsDashboard

❌ Parsers de STATUS

❌ Parsers de RESULTS

❌ Parsers de CAN

❌ Stores (useSignalsStore)

Todo funciona automáticamente al agregar una entrada nueva en defaultSignalMap.