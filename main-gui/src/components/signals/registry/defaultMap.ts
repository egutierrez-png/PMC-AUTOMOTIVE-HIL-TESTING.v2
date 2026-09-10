import type { SignalDefinition } from "./type";

export const defaultSignalMap: SignalDefinition[] = [
  //
  // =====================================================
  // A) Señales del STATUS — Runtime del test
  // =====================================================
  //
  {
    name: "current_step",
    source: "STATUS",
    path: "current_step",
    scale: 1,
    collapsed: false
  },
  {
    name: "total_steps",
    source: "STATUS",
    path: "total_steps",
    collapsed: false
  },
  {
    name: "status_running_flag",
    source: "STATUS",
    path: "status",
    collapsed: false,
    // Convertimos RUNNING / PASS / FAIL a 1 o 0
    // (el parser va a hacer: raw === "RUNNING" ? 1 : 0)
    scale: 1
  },
  {
    name: "status_seq",
    source: "STATUS",
    path: "seq",
    collapsed: false,
    scale: 1
  },
  {
    name: "status_ts",
    source: "STATUS",
    path: "ts",
    collapsed: false,
    scale: 1
  },

  //
  // =====================================================
  // B) Señales de RESULTS — Datos medidos por step
  // =====================================================
  //
  {
    name: "result_measured_position",
    source: "RESULTS",
    path: "measured_position",
    scale: 1,
    collapsed: false
  },
  {
    name: "result_response_time_ms",
    source: "RESULTS",
    path: "response_time_ms",
    collapsed: false,
    scale: 1
  },
  {
    name: "result_status_flag",
    source: "RESULTS",
    path: "status",
    collapsed: false,
    // parser convertirá PASS=1, FAIL=0
    scale: 1
  },

  //
  // =====================================================
  // C) Señales CAN (placeholder inicial)
  // =====================================================
  //
  {
    name: "can_temperature_C",
    source: "CAN",
    frameId: 0x18FF50E5,
    byteOffset: 4,
    length: 2,
    type: "uint16",
    scale: 0.1,
    collapsed: false
  }
];
