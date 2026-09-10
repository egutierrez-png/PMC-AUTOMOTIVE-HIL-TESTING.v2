// ============================================================================
// v114_defs.h
// Definiciones específicas para actuador V114
// Basado en documentación de BWTS (tablas 4–7 y diagramas Fig. 8–9)
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// NAMESPACE de constantes (sin #define)
// ============================================================================
namespace V114 {

  // ---------------- CAN CONFIGURATION ----------------
  static constexpr uint32_t CAN__DEFAULT_BAUDRATE       = 500000;  // CAN J2284-3 500 kbps
  static constexpr uint32_t CAN_ID_ECM_CMD     = 0x225;   // ECM → VGT Command
  static constexpr uint32_t CAN_ID_VGT_STATUS  = 0x236;   // VGT → ECM Status
  static constexpr uint32_t CAN_ID_ENGINE_DATA = 0x221;   // PCM/ECM Engine Info

  // Campos relevantes de tramas CAN
  static constexpr uint8_t SIGNAL_VGT_DESIRED_POS   = 0x00;  // % travel (0–100%)
  static constexpr uint8_t SIGNAL_VGT_CMD_ON        = 0x01;  // Bit de habilitación (0=OFF,1=ON)
  static constexpr uint8_t SIGNAL_VGT_ACTUAL_POS    = 0x02;  // % travel real
  static constexpr uint8_t SIGNAL_VGT_STATUS_CODE   = 0x03;  // Estado / fault bits
  static constexpr uint8_t SIGNAL_VGT_INTERNAL_TEMP = 0x04;  // °C

  // ---------------- EEPROM ADDRESSES (Table 5) ----------------
  namespace EEProm {
    static constexpr uint16_t SPAN_DEVIATION        = 0xE67E;
    static constexpr uint16_t ACTIVE_ERROR_CODES    = 0xE79E;
    static constexpr uint16_t READ_CHECKSUM_ADDR    = 0xE254;
    static constexpr uint16_t BW_SERIAL_NUMBER      = 0xE1E2;
    static constexpr uint16_t GET_CHECKSUM_ADDR     = 0xE7B2;
    static constexpr uint16_t EOL_SPAN              = 0xE250;
    static constexpr uint16_t LOGGED_ERROR_CODES    = 0xE232;
    static constexpr uint16_t GET_CHECKSUM_ADDR_P   = 0x002E;
    static constexpr uint16_t CONTROL               = 0xE1E1;
    static constexpr uint16_t STATUS                = 0xE1E0;
  }

  // ---------------- EEPROM COMMANDS (Table 5) ----------------
  namespace Cmd {
    static constexpr uint8_t CLEAR_ROLLING_FAULTS   = 0x0D;
    static constexpr uint8_t COMMIT_SERIAL_NUMBER   = 0x21;
    static constexpr uint8_t CLEAR_EOL              = 0x11;
    static constexpr uint8_t CLEAR_FAULTS           = 0x14;
    static constexpr uint8_t READ_SERIAL_NUMBER     = 0x3C;
    static constexpr uint8_t GET_CHECKSUM_CMD       = 0x3E;
  }

} // namespace V114

// ============================================================================
// SETUP PARAMETERS (Table 6)
// ============================================================================
struct V114SetupParams {
  uint16_t PWM_HEX                = 0xE07B;
  uint16_t ACTUATOR_MOVE_TIME_MS  = 250;
  bool     COMPLETE_EOL_CLEAR     = false;
  bool     CLEAR_LOGGED_ERRORS    = true;
  bool     CLEAR_ROLLING_FAULTS   = true;
  uint16_t CRUISE_FWD_TIME_MS     = 60;
  uint16_t CRUISE_TIME_MS         = 60;
  uint16_t FAILSAFE_TIMEOUT_MS    = 5000;
  float    FORWARD_INITIAL_POS    = 0.0f;   // [%]
  float    FORWARD_TARGET_POS     = 90.0f;  // [%]
  uint16_t FWD_DELAY_TIME_MS      = 5000;
  uint16_t INRUSH_DELAY_MS        = 70;
  uint16_t INRUSH_THRESHOLD_MS    = 2;
  uint16_t MOVING_AVG_MS          = 20;
  uint16_t POWER_OFF_DELAY_MS     = 2000;
  bool     POWERUP_EOL_CLEAR      = true;
  uint16_t REV_DELAY_TIME_MS      = 200;
  float    REVERSE_INITIAL_POS    = 100.0f; // [%]
  float    REVERSE_TARGET_POS     = 0.0f;   // [%]
  uint16_t SELF_LEARN_EOL_DELAY   = 5000;
  float    SELF_LEARN_VOLTAGE_V   = 13.5f;
};

// ============================================================================
// CONFIGURATION LIMITS (Table 7)
// ============================================================================
struct V114ConfigLimits {
  // Posiciones y Span
  int   MECH_EOL_SPAN_MIN_COUNTS = 380;
  int   MECH_EOL_SPAN_MAX_COUNTS = 400;
  int   SPAN_DEVIATION_MIN       = -10;
  int   SPAN_DEVIATION_MAX       = 10;

  // Corrientes y Voltajes
  float FWD_CURRENT_MAX_A        = 1.5f;
  float FWD_MAX_CURRENT_A        = 2.5f;
  float REV_CURRENT_MAX_A        = 0.65f;
  float REV_MAX_CURRENT_A        = 1.5f;
  float VOLTAGE_MIN_V            = 12.7f;
  float VOLTAGE_MAX_V            = 14.0f;

  // Posiciones objetivo
  float FWD_POSITION_MIN_PCT     = 85.0f;
  float FWD_POSITION_MAX_PCT     = 95.0f;
  float REV_POSITION_MIN_PCT     = -5.0f;
  float REV_POSITION_MAX_PCT     = 5.0f;

  // Temperatura
  float TEMP_MIN_C               = 10.0f;
  float TEMP_MAX_C               = 40.0f;

  // Failsafe
  uint16_t FAILSAFE_TIME_MAX_MS  = 1000;
  float    FAILSAFE_POS_MAX_PCT  = 10.0f;
};

// ============================================================================
// TEST SEQUENCE DEFAULTS (from Figures 8–9)
// ============================================================================
namespace V114TestSequence {
  // Paso 1 – Power ON
  static constexpr uint16_t POWER_ON_DELAY_MS = 2000;

  // Paso 2 – Clear EOL Learn
  static constexpr uint8_t  CMD_CLEAR_EOL = V114::Cmd::CLEAR_EOL;

  // Paso 3 – Sweep tests
  static constexpr uint16_t SWEEP_DELAY_MS = 5000;

  // Paso 4 – Unpowered return test
  static constexpr float    UNPOWERED_RETURN_CMD_POS       = 90.0f;  // %
  static constexpr uint16_t UNPOWERED_RETURN_WAIT_MS       = 5000;
  static constexpr float    UNPOWERED_RETURN_TARGET_POS_LT = 2.0f;   // %
  static constexpr uint16_t UNPOWERED_RETURN_TIMEOUT_MS    = 5000;

  // Paso 5 – Power OFF al finalizar
  static constexpr uint16_t POWER_OFF_DELAY_MS = 2000;
}

// ============================================================================
// PERFIL COMBINADO + METADATOS DE BUS
// ============================================================================
struct V114FamilyProfile {
  // Metadatos de bus (útiles para configurar transport)
  uint32_t can_bitrate = V114::CAN__DEFAULT_BAUDRATE;
  uint32_t tx_id       = V114::CAN_ID_ECM_CMD;
  uint32_t rx_id       = V114::CAN_ID_VGT_STATUS;
  uint16_t default_timeout_ms = 1000;

  // Parámetros y límites
  V114SetupParams   setup;
  V114ConfigLimits  limits;

  // Nombre para logs (consistencia con otras familias)
  const char* name = "V114";
};

// ============================================================================
// API pública esperada por FamilyManager
// ============================================================================
inline V114FamilyProfile getV114Profile(){
   V114FamilyProfile p;
   return p; 
}
