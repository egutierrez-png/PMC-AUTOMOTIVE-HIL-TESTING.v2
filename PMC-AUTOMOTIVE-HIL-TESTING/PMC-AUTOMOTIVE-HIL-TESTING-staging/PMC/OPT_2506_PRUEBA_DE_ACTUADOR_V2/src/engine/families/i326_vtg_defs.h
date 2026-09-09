// ============================================================================
// i326_vtg_defs.h
// I326 / VTG Family Definitions
// Basado en DBC VTG - CAN 250 kbps, 29-bit extended
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// 1) COMUNICACION
// ============================================================================
namespace I326_VTG {
  static constexpr uint32_t CAN_DEFAULT_BAUDRATE = 250000;

  // IDs reales del DBC
  static constexpr uint32_t CMD_ID    = 0x98FFF000;
  static constexpr uint32_t STATUS_ID = 0x98FFF1B1;
}

// ============================================================================
// 2) PARAMETROS / TIEMPOS
// ============================================================================
namespace I326_VTG_Config {
  constexpr uint16_t DEFAULT_TIMEOUT_MS    = 1000;
  constexpr uint16_t ACTUATOR_MOVE_TIME_MS = 270;
  constexpr uint16_t FAILSAFE_TIMEOUT_MS   = 5000;

  constexpr uint8_t  FORWARD_INITIAL_PCT   = 0;
  constexpr uint8_t  FORWARD_TARGET_PCT    = 90;
  constexpr uint8_t  REVERSE_INITIAL_PCT   = 100;
  constexpr uint8_t  REVERSE_TARGET_PCT    = 10;

  constexpr uint8_t  FAILSAFE_FINAL_MAX_PCT = 5;
}

// ============================================================================
// 3) SEÑALES DEL DBC
// ============================================================================
namespace I326_VTG_Signals {
  // vtg_command (0x98FFF000)
  // vtg_desired_pos : 0|16@1+ (0.1,0)
  // vtg_cmd_on      : 23|1@1+
  constexpr uint8_t DESIRED_POS_LSB_BYTE = 0;
  constexpr uint8_t DESIRED_POS_MSB_BYTE = 1;

  constexpr uint8_t CMD_ON_BYTE = 2;
  constexpr uint8_t CMD_ON_MASK = 0x80; // bit 23
}

// ============================================================================
// 4) STATUS FLAGS
// ============================================================================
namespace I326_VTG_StatusBits {
  // byte 3 = bits 24..31
  constexpr uint8_t CAN_TIMEOUT_BYTE      = 3;
  constexpr uint8_t CAN_TIMEOUT_MASK      = 0x01; // bit 24

  constexpr uint8_t PWM_INPUT_ERR_BYTE    = 3;
  constexpr uint8_t PWM_INPUT_ERR_MASK    = 0x02; // bit 25

  constexpr uint8_t IGN_VOLT_FAULT_BYTE   = 3;
  constexpr uint8_t IGN_VOLT_FAULT_MASK   = 0x04; // bit 26

  constexpr uint8_t MTR_DISABLED_BYTE     = 3;
  constexpr uint8_t MTR_DISABLED_MASK     = 0x08; // bit 27

  constexpr uint8_t RESP_WARN_BYTE        = 3;
  constexpr uint8_t RESP_WARN_MASK        = 0x10; // bit 28

  constexpr uint8_t ACTUATION_ERR_BYTE    = 3;
  constexpr uint8_t ACTUATION_ERR_MASK    = 0x20; // bit 29

  constexpr uint8_t TEMP_WARNING_BYTE     = 3;
  constexpr uint8_t TEMP_WARNING_MASK     = 0x40; // bit 30

  constexpr uint8_t TEMP_FAULT_BYTE       = 3;
  constexpr uint8_t TEMP_FAULT_MASK       = 0x80; // bit 31

  // byte 4 = bits 32..39
  constexpr uint8_t NO_CMD_SOURCE_BYTE    = 4;
  constexpr uint8_t NO_CMD_SOURCE_MASK    = 0x20; // bit 37

  constexpr uint8_t STOP_WARN_BYTE        = 4;
  constexpr uint8_t STOP_WARN_MASK        = 0x40; // bit 38

  constexpr uint8_t SPAN_TOO_LARGE_BYTE   = 4;
  constexpr uint8_t SPAN_TOO_LARGE_MASK   = 0x80; // bit 39
}

// ============================================================================
// 5) HELPERS DE ENCODE / DECODE
// ============================================================================
namespace I326_VTG_Helper {

  inline uint16_t pctToRaw(float pct) {
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;
    return static_cast<uint16_t>(pct * 10.0f + 0.5f);
  }

  inline int rawToPct(uint16_t raw) {
    return static_cast<int>(raw / 10);
  }

  inline uint16_t decodeActualPositionRaw(const uint8_t* data) {
    return static_cast<uint16_t>(data[0]) |
           (static_cast<uint16_t>(data[1]) << 8);
  }

  inline int decodeActualPositionPct(const uint8_t* data) {
    return rawToPct(decodeActualPositionRaw(data));
  }

  inline int decodeInternalTempC(const uint8_t* data) {
    return static_cast<int>(data[2]) - 40;
  }

  inline bool isFlagSet(const uint8_t* data, uint8_t byteIndex, uint8_t mask) {
    return (data[byteIndex] & mask) != 0;
  }

  inline void buildCommand(uint8_t out[8], float desiredPct, bool cmdOn) {
    for (int i = 0; i < 8; i++) out[i] = 0x00;

    const uint16_t raw = pctToRaw(desiredPct);
    out[I326_VTG_Signals::DESIRED_POS_LSB_BYTE] = static_cast<uint8_t>(raw & 0xFF);
    out[I326_VTG_Signals::DESIRED_POS_MSB_BYTE] = static_cast<uint8_t>((raw >> 8) & 0xFF);

    if (cmdOn) {
      out[I326_VTG_Signals::CMD_ON_BYTE] |= I326_VTG_Signals::CMD_ON_MASK;
    }
  }

  inline void buildMotorOff(uint8_t out[8]) {
    buildCommand(out, 0.0f, false);
  }
}

// ============================================================================
// 6) RESULTADOS
// ============================================================================
struct I326_VTG_TestResult {
  bool     pass = false;
  uint16_t response_time_ms = 0;
  uint16_t failsafe_time_ms = 0;
  uint8_t  final_position_pct = 0;
  int16_t  temp_C = 0;

  bool can_timeout = false;
  bool pwm_input_err = false;
  bool ign_voltage_fault = false;
  bool motor_disabled = false;
  bool resp_warn = false;
  bool actuation_error = false;
  bool temp_warning = false;
  bool temp_fault = false;
  bool no_cmd_source = false;
  bool stop_warning = false;
  bool span_too_large = false;
};

// ============================================================================
// 7) PERFIL
// ============================================================================
struct I326_VTG_Profile {
  uint32_t can_bitrate        = I326_VTG::CAN_DEFAULT_BAUDRATE;
  uint32_t tx_id              = I326_VTG::CMD_ID;
  uint32_t rx_id              = I326_VTG::STATUS_ID;
  uint16_t default_timeout_ms = I326_VTG_Config::DEFAULT_TIMEOUT_MS;
  const char* name            = "I326_VTG";
};

inline I326_VTG_Profile getI326_VTG_Profile() {
  I326_VTG_Profile p;
  return p;
}

// ============================================================================
// 8) ALIASES LEGACY
// ============================================================================
#ifndef I326_VTG_NO_LEGACY_ALIASES
  #define I326_VTG_CAN_BAUDRATE I326_VTG::CAN_DEFAULT_BAUDRATE
  #define I326_VTG_CMD_ID       I326_VTG::CMD_ID
  #define I326_VTG_STATUS_ID    I326_VTG::STATUS_ID
#endif