// ============================================================================
// vtg_cba_defs.h  (CONSISTENTE CON v114_defs.h, sin runEolSequence)
// VTG CBA (Compact Brushless Actuator) – Family Definitions
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// 1) COMUNICACIÓN (IDs, velocidades, etc.)  → en namespace con constexpr
// ============================================================================
namespace VTG_CBA {
  // Baudrate típico; ajusta si el DBC lo especifica (250k por ahora)
  static constexpr uint32_t CAN__DEFAULT_BAUDRATE  = 250000;

  // Arbitration IDs (PLACEHOLDER). Son de 29 bits (extended).
  static constexpr uint32_t TX_ID = 0x18FF0E63;  // Tester → Actuator (TODO confirmar)
  static constexpr uint32_t RX_ID = 0x18FFD0B1;  // Actuator → Tester (TODO confirmar)

  // Opcional: ID de “status” separado
  static constexpr uint32_t ARB_ID_STATUS = 0x18FFF1B1; // TODO confirmar
}

// ============================================================================
// 2) PIDs / Identificadores de datos (PLACEHOLDER)
// ============================================================================
namespace VTG_CBA_PID {
  // TODO: Rellenar con PIDs reales del DBC/A2L
  // constexpr uint16_t POSITION_TARGET   = 0x7A00;
  // constexpr uint16_t POSITION_FEEDBACK = 0x7A01;
  // constexpr uint16_t TEMPERATURE       = 0x5601;
  // constexpr uint16_t ERROR_CODES       = 0x5501;
  // constexpr uint16_t FAULT_CODES       = 0x5502;
  // constexpr uint16_t SERIAL_NUMBER     = 0x5904;
}

// ============================================================================
// 3) FLAGS/BITS de operación (según doc 3.3.2.x)
// ============================================================================
namespace VTG_CBA_Bits {
  constexpr uint8_t MOTOR_ON_OFF            = 0b00000001;
  constexpr uint8_t LEARN_PERMISSION        = 0b00000010;
  constexpr uint8_t SPAN_LEARN_RESET        = 0b00000100;
  constexpr uint8_t END_OF_LINE_LEARN_CLEAR = 0b00001000;
}

// ============================================================================
// 4) PARÁMETROS / LÍMITES DE PRUEBA (EOL + Response) (placeholders)
// ============================================================================
namespace VTG_CBA_Config {
  // Response Test (Fig. 2)
  constexpr uint16_t RESPONSE_MAX_MS_PER_STEP = 250;
  constexpr uint8_t  RESPONSE_POS_LOW_PCT     = 0;
  constexpr uint8_t  RESPONSE_POS_HIGH_PCT    = 100;

  // EOL (Fig. 1)
  constexpr uint16_t EOL_WAIT_MS              = 2000;
  constexpr uint8_t  EOL_MAX_RETRIES          = 2;

  // Ambiente / alim
  constexpr int8_t   TEMP_MIN_C               = 0;
  constexpr int8_t   TEMP_MAX_C               = 40;
  constexpr float    SUPPLY_TOLERANCE_V       = 1.0f;
}

// ============================================================================
// 5) MENSAJES CAN helper (PLACEHOLDER)
// ============================================================================
namespace VTG_CBA_Msg {
  // Si usas frames OEM fijos, declara aquí los 8B (MOTOR_ON/OFF/etc.)
  // const uint8_t MOTOR_ON[8]  = {...};
  // const uint8_t MOTOR_OFF[8] = {...};

  inline void buildUDS_Read(uint16_t pid, uint8_t out[8]) {
    out[0] = 0x22;
    out[1] = (pid >> 8) & 0xFF;
    out[2] = (pid & 0xFF);
    for (int i = 3; i < 8; ++i) out[i] = 0x00;
  }

  inline void buildUDS_Write(uint16_t pid, uint8_t value, uint8_t out[8]) {
    out[0] = 0x2E;
    out[1] = (pid >> 8) & 0xFF;
    out[2] = (pid & 0xFF);
    out[3] = value;
    for (int i = 4; i < 8; ++i) out[i] = 0x00;
  }
}

// ============================================================================
// 6) RESULTADOS (para logging/SQLite)  — opcional
// ============================================================================
struct VTG_CBA_TestResult {
  bool     pass = false;
  uint16_t t_0_to_100_ms = 0;
  uint16_t t_100_to_0_ms = 0;
  int16_t  temperature_C = 0;
  float    supply_V = 0.0f;
  uint8_t  error_code = 0;
  uint8_t  fault_code = 0;
  uint32_t serial_number = 0;
  uint32_t part_number = 0;
};

// ============================================================================
// 7) PERFIL CONSISTENTE (como en V114) + getter
// ============================================================================
struct VTG_CBA_Profile {
  uint32_t can_bitrate       = VTG_CBA::CAN__DEFAULT_BAUDRATE;
  uint32_t tx_id             = VTG_CBA::TX_ID;   // 29-bit → extended
  uint32_t rx_id             = VTG_CBA::RX_ID;   // 29-bit → extended
  uint16_t default_timeout_ms = 1000;
  const char* name           = "VTG_CBA";
};

inline VTG_CBA_Profile getVTG_CBA_Profile() {
  VTG_CBA_Profile p;
  return p;
}
/*
 * Notas de integración:
 * - FamilyManager: para familia "VTG" selecciona _can y deja que TestEngine
 *   ejecute la Recipe que recibes por MQTT/HMI. No se llama run*EolSequence.
 * - 29-bit IDs: tu can_transport debe marcar los frames como extendidos
 *   (p.ej., deduciendo extended = (id > 0x7FF)).
 */
