#pragma once
#include <stdint.h>

/**
 * ============================================================
 *    MODBUS REGISTER MAP — PMC TESTER (Industrial Grade)
 * ============================================================
 *
 *  - Basado en mejores prácticas Siemens, Schneider, Yokogawa.
 *  - Compatible con Modbus RTU (0x03, 0x06).
 *  - Todos los registros son Holding Registers (40000+ lógica).
 *  - Internamente usamos direcciones 0-based.
 *
 *  Organización:
 *  0000–0099 → Identificación del dispositivo (RO)
 *  0100–0199 → Control / Commands (RW)
 *  0200–0299 → Estado del engine en tiempo real (RO)
 *  0300–0399 → Información de la receta / perfil (RO)
 * ============================================================
 */

// ============================================================
// DEVICE IDENTIFICATION (0x0000 - 0x0009)
// ============================================================
enum ModbusDeviceRegs : uint16_t {
    REG_DEVICE_TYPE        = 0x0000,   // RO (1 = PMC Tester)
    REG_FW_MAJOR           = 0x0001,   // RO
    REG_FW_MINOR           = 0x0002,   // RO
    REG_RUN_MODE           = 0x0003,   // RO (0=IDLE,1=AUTO,2=MANUAL)
    REG_PROTOCOL_TYPE      = 0x0004,   // RO (0=CAN,1=UART)
    REG_ACTIVE_FAMILY_ID   = 0x0005,   // RO (hash)
    REG_HEARTBEAT          = 0x0006,   // RO monotonic counter
};


// ============================================================
// CONTROL COMMANDS (0x0100 - 0x0110)
// ============================================================
// Escribir un comando en REG_COMMAND → ejecuta acción → PMC limpia a 0.
enum ModbusControlRegs : uint16_t {
    REG_COMMAND            = 0x0100,   // RW – escribir aquí activa un comando
    REG_COMMAND_STATUS     = 0x0101,   // RO – 0=OK,1=INVALID,2=BUSY,3=ERROR
    REG_LAST_ERROR_CODE    = 0x0102,   // RO – últimos errores del engine

    // Opcional: parámetro extra para RUN_SINGLE_STEP
    REG_COMMAND_PARAM      = 0x0103,   // RW – parámetro (ej: índice de step)
};

// ============================================================
// COMMAND CODES
// ============================================================
enum ModbusCommandCode : uint16_t {
    CMD_NONE               = 0,

    CMD_START              = 1,   // start() del engine
    CMD_STOP               = 2,   // si implementas stop suave
    CMD_ABORT              = 3,   // abort()

    CMD_SET_MODE_AUTO      = 4,   // GlobalContext.setRunMode(AUTO)
    CMD_SET_MODE_MANUAL    = 5,   // GlobalContext.setRunMode(MANUAL)

    CMD_RUN_SINGLE_STEP    = 6,   // usa REG_COMMAND_PARAM para step index

    CMD_RESET_DEVICE       = 7,   // NVIC_SystemReset()
    CMD_STATUS_ONLINE      = 8,   // Manda initMessage() MQTT
};

// Command status codes
enum ModbusCommandStatus : uint16_t {
    CMD_STATUS_OK              = 0,
    CMD_STATUS_INVALID         = 1,
    CMD_STATUS_BUSY            = 2,
    CMD_STATUS_ERROR           = 3,
};


// ============================================================
// ENGINE STATUS (0x0200 - 0x0299)
// ============================================================
enum ModbusEngineRegs : uint16_t {
    REG_ENGINE_STATE        = 0x0200,  // RO (0=IDLE,1=RUNNING,2=ERROR,3=DONE)
    REG_CURRENT_STEP        = 0x0201,  // RO
    REG_TOTAL_STEPS         = 0x0202,  // RO

    REG_PASS_FAIL           = 0x0203,  // RO (0=Unknown,1=PASS,2=FAIL)
    REG_RESPONSE_TIME_MS    = 0x0204,  // RO
    REG_MEASURE_VALUE       = 0x0205,  // RO (valor del step actual)
    REG_MEASURE_UNIT        = 0x0206,  // RO (0=C°,1=Position,2=Angle,...)
    REG_STEP_STATUS         = 0x0207,  // RO (0=OK,1=Timeout,2=CRC error,...)
};


// Estados del engine
enum EngineStateCode : uint16_t {
    ENG_IDLE      = 0,
    ENG_RUNNING   = 1,
    ENG_ERROR     = 2,
    ENG_DONE      = 3,
};


// Unidades de medida del paso
enum MeasureUnit : uint16_t {
    UNIT_NONE     = 0,
    UNIT_CELSIUS  = 1,
    UNIT_POSITION = 2,    // ej: mm
    UNIT_ANGLE    = 3,    // grados
    UNIT_VOLTAGE  = 4,
    UNIT_CURRENT  = 5,
};


// Paso status
enum StepStatusCode : uint16_t {
    STEP_OK          = 0,
    STEP_TIMEOUT     = 1,
    STEP_CRC_ERROR   = 2,
    STEP_SENSOR_ERR  = 3,
    STEP_OUT_OF_RANGE= 4,
};


// ============================================================
// RECIPE / PROFILE INFO (0x0300 - 0x0399)
// ============================================================
enum ModbusRecipeRegs : uint16_t {
    REG_JOB_ID_HASH        = 0x0300,   // RO
    REG_SERIAL_HASH        = 0x0301,   // RO
    REG_STEPS_COUNT        = 0x0302,   // RO (igual que TOTAL_STEPS)
    REG_PROFILE_ID_HASH    = 0x0303,   // RO
};


// ============================================================
// Helper functions (opcionales)
// ============================================================
static inline uint16_t hash16(const char* s) {
    uint16_t h = 0;
    while (*s) h = (h * 131) + *s++;
    return h;
}

