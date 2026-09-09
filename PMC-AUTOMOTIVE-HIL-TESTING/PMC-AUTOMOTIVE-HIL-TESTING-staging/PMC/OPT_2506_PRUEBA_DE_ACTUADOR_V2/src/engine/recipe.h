#pragma once
#include <Arduino.h>
#include <vector>
#include "../utils/checksum_utils.h"



/**
 * Recipe
 * -------
 * Representa una secuencia de pasos de prueba a ejecutar.
 * Cada Step contiene la acción (Action) y sus parámetros.
 * 
 * Estructura:
 *  - job_id: identificador del trabajo o prueba.
 *  - serial: número de serie del actuador.
 *  - steps:  vector de pasos a ejecutar por TestEngine.
 */

// =========================================================
// ENUMERACIÓN DE ACCIONES (moverla aquí)
// =========================================================
enum class Action {
    COMMAND_POSITION,  // Manda posición deseada (UDS 0x2E)
    MOTOR_OFF,         // Apaga motor
    WAIT,              // Espera (delay)
    CUSTOM_FRAME,      // Enviar frame CAN fijo (VTG/WG)
    SET_FLAG,          // Modificar bit de flag
    READ_PID,          // Futuro: leer parámetro UDS (0x22)
    CLEAR_CODES,       // Futuro: limpiar errores
    UNKNOWN
};

// =========================================================
// ESTRUCTURA DE UN PASO (STEP) – definición completa
// =========================================================
struct Step {
    Action action;              // tipo de acción a ejecutar
    int position = 0;           // posición objetivo (si aplica)
    int pid_major = 0;          // PID High (para UDS)
    int pid_minor = 0;          // PID Low  (para UDS)
    int duration_ms = 0;        // para WAIT
    int timeout_ms = 1000;      // tiempo máximo de respuesta
    int final_position_less_than = 0; // validación failsafe

    // Campos para CUSTOM_FRAME:
    uint32_t frame_id = 0;      // arbitration ID (CAN)
    uint8_t frame_data[8] = {0};
    bool expect_response = false;

    // Campos para SET_FLAG:
    int bit_index = 0;
    bool bit_state = false;
    bool has_checksum = false;
    ChecksumSpec checksum;
};

// =========================================================
// RECIPE
// =========================================================
struct Recipe {
    String job_id;                 // ID de la orden o prueba
    String serial;                 // Número de serie del actuador
    String family; 
    std::vector<Step> steps;       // Secuencia de pasos a ejecutar
};
