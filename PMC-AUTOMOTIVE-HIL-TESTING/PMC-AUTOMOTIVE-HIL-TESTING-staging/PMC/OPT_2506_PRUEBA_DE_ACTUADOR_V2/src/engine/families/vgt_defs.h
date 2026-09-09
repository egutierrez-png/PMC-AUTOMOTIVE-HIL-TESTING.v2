// ============================================================================
// vgt_defs.h
// VGT Family Definitions
// Basado en DBC VGT_Command / VGT_Status
// CAN standard 11-bit
// ============================================================================

#pragma once
#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// 1) COMUNICACION
// ============================================================================
namespace VGT_CAN {
  static constexpr uint32_t CAN_DEFAULT_BAUDRATE = 500000;

  // IDs reales del DBC
  static constexpr uint32_t COMMAND_ID = 0x235;   // BO_ 565 VGT_Command
  static constexpr uint32_t STATUS_ID  = 0x236;   // BO_ 566 VGT_Status
}

// ============================================================================
// 2) PARAMETROS / TIEMPOS
// ============================================================================
namespace VGT_Config {
  constexpr uint16_t DEFAULT_TIMEOUT_MS    = 1000;
  constexpr uint16_t ACTUATOR_MOVE_TIME_MS = 500;
  constexpr uint16_t FAILSAFE_TIMEOUT_MS   = 5000;

  constexpr uint8_t FORWARD_INITIAL_PCT = 0;
  constexpr uint8_t FORWARD_TARGET_PCT  = 90;
  constexpr uint8_t MID_TARGET_PCT      = 50;
  constexpr uint8_t REVERSE_TARGET_PCT  = 10;

  constexpr uint8_t POSITION_TOLERANCE_PCT = 5;
}

// ============================================================================
// 3) SEÑALES DEL DBC
// Basado en:
// BO_ 565 VGT_Command
// SG_ VGT_CMD_ON      : 23|1@0+
// SG_ VGT_DESIRED_POS : 7|16@0+ (0.1,0)
//
// BO_ 566 VGT_Status
// SG_ VGT_ACTUAL_POS    : 7|16@0+ (0.1,0)
// SG_ VGT_STATUS_CODE   : 23|8@0+
// SG_ VGT_INTERNAL_TEMP : 31|8@0+ (1,-40)
// ============================================================================
namespace VGT_Signals {
  // Command
  constexpr uint8_t DESIRED_POS_MSB_BYTE = 0;
  constexpr uint8_t DESIRED_POS_LSB_BYTE = 1;

  constexpr uint8_t CMD_ON_BYTE = 2;
  constexpr uint8_t CMD_ON_MASK = 0x80; // bit 23 en Motorola

  // Status
  constexpr uint8_t ACTUAL_POS_MSB_BYTE = 0;
  constexpr uint8_t ACTUAL_POS_LSB_BYTE = 1;
  constexpr uint8_t STATUS_CODE_BYTE    = 2;
  constexpr uint8_t INTERNAL_TEMP_BYTE  = 3;
}

// ============================================================================
// 4) STATUS CODES
// ============================================================================
namespace VGT_StatusCode {
  constexpr uint8_t OPERATION_OKAY           = 0;
  constexpr uint8_t TEMP_FAULT               = 1;
  constexpr uint8_t TEMP_WARNING             = 2;
  constexpr uint8_t ACTUATION_ERROR          = 3;
  constexpr uint8_t ACTUATOR_RESP_WARN       = 4;
  constexpr uint8_t MOTOR_DISABLED_BY_DIAG   = 5;
  constexpr uint8_t IGNITION_VOLTAGE_FAULT   = 6;
  constexpr uint8_t PWM_CMD_SOURCE_INPUT_ERR = 7;
  constexpr uint8_t CAN_CMD_SOURCE_TIMEOUT   = 8;
  constexpr uint8_t LEARN_STOPSPAN_TOO_LARGE = 9;
  constexpr uint8_t STOP_HI_STOP_LO_WARNING  = 10;
  constexpr uint8_t NO_CMD_SOURCE            = 11;
}

// ============================================================================
// 5) HELPERS DE ENCODE / DECODE
// ============================================================================
namespace VGT_Helper {

  inline uint16_t pctToRaw(float pct) {
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;
    return static_cast<uint16_t>(pct * 10.0f + 0.5f);
  }

  inline float rawToPct(uint16_t raw) {
    return static_cast<float>(raw) * 0.1f;
  }

  inline uint16_t decodeActualPositionRaw(const uint8_t* data) {
    return (static_cast<uint16_t>(data[VGT_Signals::ACTUAL_POS_MSB_BYTE]) << 8) |
            static_cast<uint16_t>(data[VGT_Signals::ACTUAL_POS_LSB_BYTE]);
  }

  inline float decodeActualPositionPct(const uint8_t* data) {
    return rawToPct(decodeActualPositionRaw(data));
  }

  inline int decodeInternalTempC(const uint8_t* data) {
    return static_cast<int>(data[VGT_Signals::INTERNAL_TEMP_BYTE]) - 40;
  }

  inline uint8_t decodeStatusCode(const uint8_t* data) {
    return data[VGT_Signals::STATUS_CODE_BYTE];
  }

  inline const char* statusCodeToText(uint8_t code) {
    switch (code) {
      case VGT_StatusCode::OPERATION_OKAY:           return "Operation_Okay";
      case VGT_StatusCode::TEMP_FAULT:               return "Temp_Fault";
      case VGT_StatusCode::TEMP_WARNING:             return "Temp_Warning";
      case VGT_StatusCode::ACTUATION_ERROR:          return "Actuation_Error";
      case VGT_StatusCode::ACTUATOR_RESP_WARN:       return "Actuator_Resp_Warn";
      case VGT_StatusCode::MOTOR_DISABLED_BY_DIAG:   return "Mtr_Disabled_By_Diag";
      case VGT_StatusCode::IGNITION_VOLTAGE_FAULT:   return "Ignition_Voltage_Fault";
      case VGT_StatusCode::PWM_CMD_SOURCE_INPUT_ERR: return "PWM_Cmd_Source_Inpt_Err";
      case VGT_StatusCode::CAN_CMD_SOURCE_TIMEOUT:   return "CAN_Cmd_Source_Timeout";
      case VGT_StatusCode::LEARN_STOPSPAN_TOO_LARGE: return "Learn_StopSpan_2_Large";
      case VGT_StatusCode::STOP_HI_STOP_LO_WARNING:  return "Stop_Hi_Stop_Lo_warning";
      case VGT_StatusCode::NO_CMD_SOURCE:            return "No_Cmd_Source";
      default:                                       return "Unknown";
    }
  }

  inline void buildCommand(uint8_t out[8], float desiredPct, bool cmdOn) {
    for (int i = 0; i < 8; i++) out[i] = 0x00;

    const uint16_t raw = pctToRaw(desiredPct);

    // Motorola / big-endian para 7|16@0+
    out[VGT_Signals::DESIRED_POS_MSB_BYTE] = static_cast<uint8_t>((raw >> 8) & 0xFF);
    out[VGT_Signals::DESIRED_POS_LSB_BYTE] = static_cast<uint8_t>(raw & 0xFF);

    if (cmdOn) {
      out[VGT_Signals::CMD_ON_BYTE] |= VGT_Signals::CMD_ON_MASK;
    }
  }

  inline void buildMotorOff(uint8_t out[8]) {
    buildCommand(out, 0.0f, false);
  }
}

// ============================================================================
// 6) RESULTADOS
// ============================================================================
struct VGT_TestResult {
  bool     pass = false;
  uint16_t response_time_ms = 0;
  uint16_t failsafe_time_ms = 0;
  float    final_position_pct = 0.0f;
  int16_t  temp_C = 0;
  uint8_t  status_code = 0;
  const char* status_text = "Unknown";
};

// ============================================================================
// 7) PERFIL
// ============================================================================
struct VGT_Profile {
  uint32_t can_bitrate        = VGT_CAN::CAN_DEFAULT_BAUDRATE;
  uint32_t tx_id              = VGT_CAN::COMMAND_ID;
  uint32_t rx_id              = VGT_CAN::STATUS_ID;
  uint16_t default_timeout_ms = VGT_Config::DEFAULT_TIMEOUT_MS;
  const char* name            = "VGT_0x235_0x236";
};

inline VGT_Profile getVGT_Profile() {
  VGT_Profile p;
  return p;
}

// ============================================================================
// 8) ALIASES LEGACY
// ============================================================================
#ifndef VGT_NO_LEGACY_ALIASES
  #define VGT_CAN_BAUDRATE VGT_CAN::CAN_DEFAULT_BAUDRATE
  #define VGT_COMMAND_ID   VGT_CAN::COMMAND_ID
  #define VGT_STATUS_ID    VGT_CAN::STATUS_ID
#endif