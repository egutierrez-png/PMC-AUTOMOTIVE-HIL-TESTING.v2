// ============================================================================
// vtg_jd_defs.h  (CONSISTENTE con v114_defs.h / vtg_cba_defs.h / wg_defs.h)
// VTG (John Deere Tier 3 – SRA) Family Definitions
// Protocol: CAN (250 kbps) – IDs de 29 bits (extended)
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// 1) COMUNICACIÓN (namespace + constexpr)
// ============================================================================
namespace VTG_JD {
  static constexpr uint32_t CAN__DEFAULT_BAUDRATE  = 250000;
  static constexpr uint32_t ARB_ID_STATUS     = 0x18FFF1B1; // Status Arbitration ID
  static constexpr uint32_t TX_ID             = 0x18FF0E63; // Tester → Actuator (placeholder)
  static constexpr uint32_t RX_ID             = 0x18FFD0B1; // Actuator → Tester (placeholder)
}

// ============================================================================
// 2) PIDs (Table 1 – SRA PID values) [bytes-decimal]  (mantengo tu layout)
// ============================================================================
namespace VTG_JD_PID {
  constexpr uint8_t PN_START             = 118;
  constexpr uint8_t PN_END               = 121;

  constexpr uint8_t SN_START             = 200;
  constexpr uint8_t SN_END               = 203;

  constexpr uint8_t POWER_CYCLES_START   = 164;
  constexpr uint8_t POWER_CYCLES_END     = 166;

  constexpr uint8_t RAM_CHECKSUM_START   = 87;
  constexpr uint8_t RAM_CHECKSUM_END     = 88;

  constexpr uint8_t ROM_CHECKSUM_START   = 92;
  constexpr uint8_t ROM_CHECKSUM_END     = 93;

  constexpr uint8_t CALIBRATION_ID       = 108;

  constexpr uint8_t LEARN_0_FIRST        = 122;  // 0% first learn
  constexpr uint8_t LEARN_0_LASTKEY      = 196;  // 0% learn, last key on
  constexpr uint8_t LEARN_100_FIRST      = 221;  // 100% first learn
  constexpr uint8_t LEARN_100_LASTKEY    = 198;  // 100% learn, last key on

  constexpr uint8_t ERROR_CODES          = 86;
  constexpr uint8_t FAULT_CODES          = 85;

  constexpr uint8_t ERROR_CODE_BUFFER    = 190;  // 190–195
  constexpr uint8_t FAULT_CODE_BUFFER    = 183;  // 183–188
}

// ============================================================================
// 3) PARÁMETROS / TIEMPOS (Table 2 & 3)
// ============================================================================
namespace VTG_JD_Config {
  // Timings de setup / pruebas
  constexpr uint16_t ActuatorMoveTime_ms        = 360;
  constexpr uint16_t CommandedLearnTime_ms      = 1500;
  constexpr uint16_t FailSafeTimeout_ms         = 5000;
  constexpr uint16_t PowerOffDelay_ms           = 5000;
  constexpr uint16_t SetupInitialPowerUpDelay_ms= 6000;
  constexpr uint16_t MaxUARTResponseTime_ms     = 100;   // ignorado en CAN
  constexpr uint16_t SelfLearnEOLDelay_ms       = 4500;
  constexpr uint16_t FwdDelayPositionTime_ms    = 4000;
  constexpr uint16_t RevDelayPositionTime_ms    = 300;

  // Targets de posición (%)
  constexpr uint8_t  ForwardInitialPosition_pct = 0;
  constexpr uint8_t  ForwardTargetPosition_pct  = 90;
  constexpr uint8_t  ReverseInitialPosition_pct = 100;
  constexpr uint8_t  ReverseTargetPosition_pct  = 10;

  // Límites de validación (Table 3)
  constexpr uint16_t FailSafeTime_max_s         = 2;
  constexpr uint16_t FailSafeTime_min_s         = 0;

  constexpr uint8_t  FwdPosition_min_pct        = 87;
  constexpr uint8_t  FwdPosition_max_pct        = 93;

  constexpr uint8_t  RevPosition_min_pct        = 7;
  constexpr uint8_t  RevPosition_max_pct        = 13;

  constexpr int8_t   Temp_min_C                 = 0;
  constexpr int8_t   Temp_max_C                 = 40;
}

// ============================================================================
// 4) MENSAJES CAN (Table 2 – payloads de 8 bytes)  (constexpr en header)
// ============================================================================
namespace VTG_JD_Msg {
  // Diagnóstico / checksum
  static constexpr uint8_t ChecksumMsg[8]           = {0x30,0x59,0x5C,0x5D,0x57,0x58,0x0F,0x00};

  // Limpieza de códigos y stops
  static constexpr uint8_t ClearCodesMsg[8]         = {0x60,0x58,0xB9,0x0F,0x02,0x7E,0x00,0x00};
  static constexpr uint8_t ClearStopsMsg[8]         = {0x60,0x58,0xB9,0x0F,0x04,0x7C,0x00,0x00};
  static constexpr uint8_t ClearUsageMsg1[8]        = {0x38,0x57,0xDC,0x01,0x94,0x00,0x00,0x00};
  static constexpr uint8_t ClearUsageMsg2[8]        = {0x38,0x5B,0x2B,0x80,0x2A,0x80,0x30,0x12}; // B7 opcional

  // Aprendizaje / calibración
  static constexpr uint8_t CommandedLearnMsg[8]     = {0x57,0x57,0xA5,0x5A,0x53,0x00,0x00,0x00};
  static constexpr uint8_t EndFirstLearnMsg[8]      = {0x30,0x57,0xDD,0xDE,0xBE,0x00,0x00,0x00};
  static constexpr uint8_t ZeroFirstLearnMsg[8]     = {0x30,0x57,0x7A,0x7B,0x84,0x00,0x00,0x00};

  // Encendido / apagado de motor
  static constexpr uint8_t MotorOnMsg[8]            = {0x60,0x58,0x89,0xA8,0x00,0x17,0x00,0x00};
  static constexpr uint8_t MotorOffMsg[8]           = {0x20,0x57,0x00,0x00,0x89,0x00,0x00,0x00};

  // Lecturas típicas
  static constexpr uint8_t PartNumberMsg[8]         = {0x30,0x59,0x76,0x77,0x78,0x79,0x99,0x00};
  static constexpr uint8_t SerialNumberMsg[8]       = {0x30,0x59,0xC8,0xC9,0xCA,0xCB,0x51,0x00};
  static constexpr uint8_t PowerCyclesMsg[8]        = {0x30,0x58,0xA4,0xA5,0xA6,0x89,0x00,0x00};
  static constexpr uint8_t TemperatureMsg[8]        = {0x30,0x56,0x51,0x29,0x00,0x00,0x00,0x00};

  // Lectura de errores / fallas
  static constexpr uint8_t ErrorCodeMsg1[8]         = {0x30,0x59,0x56,0xBE,0xBF,0xC0,0xE4,0x00};
  static constexpr uint8_t ErrorCodeMsg2[8]         = {0x30,0x58,0xC1,0xC2,0xC3,0x32,0x00,0x00};
  static constexpr uint8_t FaultCodeMsg1[8]         = {0x30,0x59,0x55,0xB7,0xB8,0xB9,0xFA,0x00};
  static constexpr uint8_t FaultCodeMsg2[8]         = {0x30,0x58,0xBA,0xBB,0xBC,0x47,0x00,0x00};
}

// ============================================================================
// 5) FLAGS (bits de operación)
// ============================================================================
namespace VTG_JD_Bits {
  constexpr uint8_t MOTOR_ON_OFF             = 0b00000001;
  constexpr uint8_t LEARN_PERMISSION         = 0b00000010;
  constexpr uint8_t SPAN_LEARN_RESET         = 0b00000100;
  constexpr uint8_t END_OF_LINE_LEARN_CLEAR  = 0b00001000;
}

// ============================================================================
// 6) RESULTADOS (opcional; para logging/SQLite)
// ============================================================================
struct VTG_JD_TestResult {
  bool     pass = false;
  uint16_t response_time_ms = 0;   // p.ej., peor de 0→100% y 100%→0%
  uint16_t failsafe_time_ms = 0;   // tiempo desde MotorOff hasta <2%
  uint8_t  final_position_pct = 0; // posición final tras failsafe
  int16_t  temp_C = 0;
  uint32_t serial_number = 0;
  uint32_t part_number = 0;
  uint16_t checksum_rom = 0;
  uint16_t checksum_ram = 0;
  uint8_t  fault_code = 0;
  uint8_t  error_code = 0;
};

// ============================================================================
// 7) PERFIL CONSISTENTE + getter (como en V114/VTG_CBA/WG)
// ============================================================================
struct VTG_JD_Profile {
  uint32_t can_bitrate        = VTG_JD::CAN__DEFAULT_BAUDRATE;
  uint32_t tx_id              = VTG_JD::TX_ID;         // 29-bit (extended)
  uint32_t rx_id              = VTG_JD::RX_ID;         // 29-bit (extended)
  uint16_t default_timeout_ms = 1000;
  const char* name            = "VTG_JD";
};

inline VTG_JD_Profile getVTG_JD_Profile() {
  VTG_JD_Profile p;
  return p;
}

// ============================================================================
// 8) ALIASES LEGACY (opcional) para no romper código con #define antiguos
// ============================================================================
#ifndef VTG_JD_NO_LEGACY_ALIASES
  #define VTG_JD_CAN_BAUDRATE      VTG_JD::CAN__DEFAULT_BAUDRATE
  #define VTG_JD_CAN_ARB_ID_STATUS VTG_JD::ARB_ID_STATUS
  #define VTG_JD_TX_ID             VTG_JD::TX_ID
  #define VTG_JD_RX_ID             VTG_JD::RX_ID
#endif

/*
 * Integración:
 * - En FamilyManager, para "VTG": _p.setTransport(_can); Engine ejecuta la Recipe.
 * - IDs de 29 bits: asegúrate que tu can_transport marque 'extended'
 *   (p.ej., extended = (id > 0x7FF)), como ya ajustaste en send/recv.
 */
