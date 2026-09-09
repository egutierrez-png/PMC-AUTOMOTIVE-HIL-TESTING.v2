export type SignalSource = "STATUS" | "RESULTS" | "CAN" | "UART";

export type SignalDefinition = {
  name: string;           // nombre interno de la señal (ej: "position_deg")
  source: SignalSource;   // STATUS | RESULTS | CAN | UART

  // Para STATUS / RESULTS:
  path?: string;          // ruta dentro del JSON (ej: "motor.position_deg")

  // Para CAN:
  frameId?: number;
  byteOffset?: number;
  length?: number;
  type?: "uint8" | "uint16" | "int16" | "float";
  scale?: number;
  collapsed?: boolean; // para UI: si la señal está colapsada inicialmente
};
