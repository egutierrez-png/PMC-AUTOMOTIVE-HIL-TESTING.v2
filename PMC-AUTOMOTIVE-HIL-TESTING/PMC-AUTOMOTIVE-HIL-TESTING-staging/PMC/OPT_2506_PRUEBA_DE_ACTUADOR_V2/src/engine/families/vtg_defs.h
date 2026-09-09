#pragma once
#include <Arduino.h>

/**
 * VTG (Variable Turbine Geometry) Family Definitions
 * Protocol: CAN (250 kbps)
 * Arbitration ID: 0x18FFF1B1
 * 
 * Source: John Deere Tier 3 VTG / BorgWarner Compact Brushless Actuator (CBA)
 * Document: S-1332 / S-1345 Performance Standard
 */

#ifndef VTG_DEFS_H
#define VTG_DEFS_H

// =====================================================
// COMMUNICATION PARAMETERS
// =====================================================
#define VTG_CAN_BAUDRATE        250000
#define VTG_CAN_ARB_ID_STATUS   0x18FFF1B1  // Actuator arbitration ID
#define VTG_TX_ID               0x18FF0E63  // Tester → Actuator
#define VTG_RX_ID               0x18FFD0B1  // Actuator → Tester
#define VTG_DEFAULT_VOLTAGE_12V 13.5
#define VTG_DEFAULT_VOLTAGE_24V 24.0

// =====================================================
// PID VALUES (decimal indexes per SRA spec Table 1)
// =====================================================
namespace VTG_PID {
    constexpr uint8_t PN_START            = 118; // Part Number
    constexpr uint8_t PN_END              = 121;
    constexpr uint8_t SN_START            = 200; // Serial Number
    constexpr uint8_t SN_END              = 203;
    constexpr uint8_t POWER_CYCLES_START  = 164;
    constexpr uint8_t POWER_CYCLES_END    = 166;
    constexpr uint8_t RAM_CHECKSUM_START  = 87;
    constexpr uint8_t RAM_CHECKSUM_END    = 88;
    constexpr uint8_t ROM_CHECKSUM_START  = 92;
    constexpr uint8_t ROM_CHECKSUM_END    = 93;
    constexpr uint8_t CALIBRATION_ID      = 108;
    constexpr uint8_t LEARN_0_FIRST       = 122;
    constexpr uint8_t LEARN_0_LASTKEY     = 196;
    constexpr uint8_t LEARN_100_FIRST     = 221;
    constexpr uint8_t LEARN_100_LASTKEY   = 198;
    constexpr uint8_t ERROR_CODES         = 86;
    constexpr uint8_t FAULT_CODES         = 85;
    constexpr uint8_t ERROR_CODE_BUFFER   = 190;
    constexpr uint8_t FAULT_CODE_BUFFER   = 183;
}

// =====================================================
// TEST / EOL CONFIGURATION PARAMETERS
// =====================================================
namespace VTG_Config {
    constexpr uint16_t ACTUATOR_MOVE_TIME_MS      = 360;
    constexpr uint16_t COMMANDED_LEARN_TIME_MS    = 1500;
    constexpr uint16_t FAILSAFE_TIMEOUT_MS        = 5000;
    constexpr uint16_t POWER_OFF_DELAY_MS         = 5000;
    constexpr uint16_t SELF_LEARN_EOL_DELAY_MS    = 4500;
    constexpr uint16_t SETUP_INITIAL_DELAY_MS     = 6000;
    constexpr uint16_t FWD_DELAY_POSITION_MS      = 4000;
    constexpr uint16_t REV_DELAY_POSITION_MS      = 300;
    constexpr uint16_t FWD_TARGET_POSITION_PCT    = 90;
    constexpr uint16_t REV_TARGET_POSITION_PCT    = 10;
    constexpr uint8_t  FWD_INITIAL_POSITION_PCT   = 0;
    constexpr uint8_t  REV_INITIAL_POSITION_PCT   = 100;
    constexpr float    SELF_LEARN_VOLTAGE_12V     = 13.5;
    constexpr float    SELF_LEARN_VOLTAGE_24V     = 24.0;
}

// =====================================================
// MESSAGE DEFINITIONS (8-byte CAN payloads)
// =====================================================
// Format: { Byte0, Byte1, Byte2, Byte3, Byte4, Byte5, Byte6, Byte7 }

namespace VTG_Msg {
    // Motor control
    const uint8_t MOTOR_ON[8]            = {0x60, 0x58, 0x89, 0xA8, 0x00, 0x17, 0x00, 0x00};
    const uint8_t MOTOR_OFF[8]           = {0x20, 0x57, 0x00, 0x00, 0x89, 0x00, 0x00, 0x00};

    // Learning / calibration
    const uint8_t COMMANDED_LEARN[8]     = {0x57, 0x57, 0xA5, 0x5A, 0x53, 0x00, 0x00, 0x00};
    const uint8_t END_FIRST_LEARN[8]     = {0x30, 0x57, 0xDD, 0xDE, 0xBE, 0x00, 0x00, 0x00};
    const uint8_t ZERO_FIRST_LEARN[8]    = {0x30, 0x57, 0x7A, 0x7B, 0x84, 0x00, 0x00, 0x00};

    // Clearing operations
    const uint8_t CLEAR_CODES[8]         = {0x60, 0x58, 0xB9, 0x0F, 0x02, 0x7E, 0x00, 0x00};
    const uint8_t CLEAR_STOPS[8]         = {0x60, 0x58, 0xB9, 0x0F, 0x04, 0x7C, 0x00, 0x00};
    const uint8_t CLEAR_USAGE1[8]        = {0x38, 0x57, 0xDC, 0x01, 0x94, 0x00, 0x00, 0x00};
    const uint8_t CLEAR_USAGE2[8]        = {0x38, 0x58, 0x2B, 0x80, 0x2A, 0x80, 0x30, 0x12};

    // Diagnostic queries
    const uint8_t CHECKSUM_QUERY[8]      = {0x30, 0x59, 0x5C, 0x5D, 0x57, 0x58, 0x0F, 0x00};
    const uint8_t POWER_CYCLES_QUERY[8]  = {0x30, 0x58, 0xA4, 0xA5, 0xA6, 0x89, 0x00, 0x00};
    const uint8_t PART_NUMBER_QUERY[8]   = {0x30, 0x59, 0x76, 0x77, 0x78, 0x79, 0x99, 0x00};
    const uint8_t SERIAL_NUMBER_QUERY[8] = {0x30, 0x59, 0xC8, 0xC9, 0xCA, 0xCB, 0x51, 0x00};
    const uint8_t TEMPERATURE_QUERY[8]   = {0x30, 0x56, 0x51, 0x29, 0x00, 0x00, 0x00, 0x00};

    // Fault reading
    const uint8_t ERROR_CODE_MSG1[8]     = {0x30, 0x59, 0x56, 0xBE, 0xBF, 0xC0, 0xE4, 0x00};
    const uint8_t ERROR_CODE_MSG2[8]     = {0x30, 0x58, 0xC1, 0xC2, 0xC3, 0x32, 0x00, 0x00};
    const uint8_t FAULT_CODE_MSG1[8]     = {0x30, 0x59, 0x55, 0xB7, 0xB8, 0xB9, 0xFA, 0x00};
    const uint8_t FAULT_CODE_MSG2[8]     = {0x30, 0x58, 0xBA, 0xBB, 0xBC, 0x47, 0x00, 0x00};
}

// =====================================================
// BIT FLAGS
// =====================================================
namespace VTG_Bits {
    constexpr uint8_t MOTOR_ON_OFF              = 0b00000001;
    constexpr uint8_t LEARN_PERMISSION          = 0b00000010;
    constexpr uint8_t SPAN_LEARN_RESET          = 0b00000100;
    constexpr uint8_t END_OF_LINE_LEARN_CLEAR   = 0b00001000;
}

// =====================================================
// STRUCTURE FOR VTG PARAMETERS (to be stored in SQLite)
// =====================================================
struct VTG_TestResult {
    uint8_t pass_fail;
    uint16_t response_time_ms;
    uint16_t failsafe_time_ms;
    uint16_t forward_position_pct;
    uint16_t reverse_position_pct;
    uint16_t temp_degC;
    uint32_t serial_number;
    uint32_t part_number;
    uint16_t checksum_rom;
    uint16_t checksum_ram;
    uint8_t  fault_code;
    uint8_t  error_code;
};

struct VTGFamilyProfile {
    float nominalVoltage;
    uint32_t baudrate;
    uint32_t arbIdStatus;
};

// Devuelve el perfil base de VTG (config de comunicación)
inline VTGFamilyProfile getVTGProfile() {
    VTGFamilyProfile p;
    p.nominalVoltage = VTG_DEFAULT_VOLTAGE_12V;
    p.baudrate = VTG_CAN_BAUDRATE;
    p.arbIdStatus = VTG_CAN_ARB_ID_STATUS;
    return p;
}

#endif // VTG_DEFS_H
