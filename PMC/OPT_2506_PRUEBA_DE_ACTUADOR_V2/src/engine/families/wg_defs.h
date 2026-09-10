// ============================================================================
// wg_defs.h  (CONSISTENTE con v114_defs.h y vtg_cba_defs.h)
// Wastegate (WG) Family Definitions
// Protocol: CAN (500 kbps) – IDs de 29 bits (extended)
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// 1) PARÁMETROS DE COMUNICACIÓN (namespace + constexpr)
// ============================================================================
namespace WG {
  // Baudrate típico
  static constexpr uint32_t CAN__DEFAULT_BAUDRATE  = 500000;

  // Arbitration IDs (PLACEHOLDER) → 29-bit (extended)
  static constexpr uint32_t ARB_ID_STATUS = 0x18FF50E5; // Actuator status (ejemplo)
  static constexpr uint32_t TX_ID         = 0x18FF60E5; // Tester → Actuator
  static constexpr uint32_t RX_ID         = 0x18FF61E5; // Actuator → Tester

  // Voltajes nominales (informativos)
  static constexpr float    DEFAULT_VOLTAGE_12V = 13.5f;
  static constexpr float    DEFAULT_VOLTAGE_24V = 24.0f;
}

// ============================================================================
// 2) "PIDs" / Identificadores (si aplica en tu protocolo)
// ============================================================================
namespace WG_PID {
  // NOTA: estos parecían offsets simbólicos; si usas UDS reales, ajusta a 0xHHLL
  constexpr uint8_t POSITION_CMD        = 0x01;
  constexpr uint8_t POSITION_FEEDBACK   = 0x02;
  constexpr uint8_t TEMPERATURE         = 0x03;
  constexpr uint8_t VOLTAGE             = 0x04;
  constexpr uint8_t ERROR_CODE          = 0x05;
  constexpr uint8_t FAULT_CODE          = 0x06;
  constexpr uint8_t SERIAL_NUM_START    = 0x10;
  constexpr uint8_t SERIAL_NUM_END      = 0x13;
  constexpr uint8_t PART_NUM_START      = 0x20;
  constexpr uint8_t PART_NUM_END        = 0x23;
}

// ============================================================================
// 3) CONFIGURACIÓN DE EOL / TEST
// ============================================================================
namespace WG_Config {
  constexpr uint16_t ACTUATOR_MOVE_TIME_MS = 400;
  constexpr uint16_t SELF_TEST_TIME_MS     = 3000;
  constexpr uint16_t POWER_OFF_DELAY_MS    = 1500;
  constexpr uint16_t FAILSAFE_TIMEOUT_MS   = 3500;
  constexpr uint8_t  OPEN_TARGET_POSITION  = 90;
  constexpr uint8_t  CLOSE_TARGET_POSITION = 10;
  constexpr uint8_t  HOME_POSITION         = 0;
  constexpr float    SUPPLY_VOLTAGE_12V    = 13.5f;
  constexpr float    SUPPLY_VOLTAGE_24V    = 24.0f;
}

// ============================================================================
// 4) MENSAJES CAN (8 bytes) — placeholders
// ============================================================================
namespace WG_Msg {
  // Control commands
  static constexpr uint8_t CMD_ENABLE[8]         = {0x20,0x58,0x89,0xA8,0x00,0x17,0x00,0x00};
  static constexpr uint8_t CMD_DISABLE[8]        = {0x20,0x57,0x00,0x00,0x89,0x00,0x00,0x00};
  static constexpr uint8_t CMD_POSITION_OPEN[8]  = {0x30,0x58,0x10,0x00,0x10,0x00,0x00,0x00};
  static constexpr uint8_t CMD_POSITION_CLOSE[8] = {0x30,0x58,0x05,0x00,0x05,0x00,0x00,0x00};

  // Diagnostic / Info
  static constexpr uint8_t QUERY_STATUS[8]       = {0x22,0xF1,0x90,0x00,0x00,0x00,0x00,0x00};
  static constexpr uint8_t QUERY_TEMPERATURE[8]  = {0x22,0xF1,0x92,0x00,0x00,0x00,0x00,0x00};
  static constexpr uint8_t QUERY_VOLTAGE[8]      = {0x22,0xF1,0x93,0x00,0x00,0x00,0x00,0x00};
  static constexpr uint8_t QUERY_ERRORS[8]       = {0x22,0xF1,0xA0,0x00,0x00,0x00,0x00,0x00};

  // Maintenance / Reset
  static constexpr uint8_t CLEAR_FAULTS[8]       = {0x14,0xFF,0x00,0x00,0x00,0x00,0x00,0x00};
  static constexpr uint8_t RESET_ACTUATOR[8]     = {0x11,0x01,0x00,0x00,0x00,0x00,0x00,0x00};
}

// ============================================================================
// 5) BIT FLAGS
// ============================================================================
namespace WG_Bits {
  constexpr uint8_t STATUS_OK         = 0b00000001;
  constexpr uint8_t STATUS_ERROR      = 0b00000010;
  constexpr uint8_t STATUS_MOVING     = 0b00000100;
  constexpr uint8_t STATUS_CALIBRATED = 0b00001000;
  constexpr uint8_t STATUS_LEARNED    = 0b00010000;
}

// ============================================================================
// 6) RESULTADOS (opcional; para logging/SQLite)
// ============================================================================
struct WG_TestResult {
  uint8_t  pass_fail = 0;
  uint16_t response_time_ms = 0;
  uint16_t temperature_degC = 0;
  uint16_t supply_voltage_mV = 0;
  uint8_t  open_position_pct = 0;
  uint8_t  closed_position_pct = 0;
  uint32_t serial_number = 0;
  uint32_t part_number = 0;
  uint8_t  error_code = 0;
  uint8_t  fault_code = 0;
};

// ============================================================================
// 7) PERFIL CONSISTENTE + getter (como en V114 / VTG_CBA)
// ============================================================================
struct WG_Profile {
  uint32_t can_bitrate        = WG::CAN__DEFAULT_BAUDRATE;
  uint32_t tx_id              = WG::TX_ID;         // 29-bit (extended)
  uint32_t rx_id              = WG::RX_ID;         // 29-bit (extended)
  uint16_t default_timeout_ms = 1000;
  const char* name            = "WG";
};

inline WG_Profile getWG_Profile() {
  WG_Profile p;
  return p;
}

// ============================================================================
// 8) ALIASES LEGACY (opcional) para no romper código viejo con #define
// ============================================================================
#ifndef WG_NO_LEGACY_ALIASES
  #define WG_CAN_BAUDRATE         WG::CAN__DEFAULT_BAUDRATE 
  #define WG_CAN_ARB_ID_STATUS    WG::ARB_ID_STATUS
  #define WG_TX_ID                WG::TX_ID
  #define WG_RX_ID                WG::RX_ID
  #define WG_DEFAULT_VOLTAGE_12V  WG::DEFAULT_VOLTAGE_12V
  #define WG_DEFAULT_VOLTAGE_24V  WG::DEFAULT_VOLTAGE_24V
#endif

/*
 * Integración:
 * - En FamilyManager, para "WG": _p.setTransport(_can); _engine.loadRecipe(...); _engine.start();
 * - Los IDs son extended (29 bits). Asegúrate que tu can_transport marque 'extended'
 *   (p.ej., deduciendo extended = (id > 0x7FF)), como ya corregimos en send/recv.
 */
