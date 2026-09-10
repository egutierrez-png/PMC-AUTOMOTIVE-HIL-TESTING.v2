#pragma once
#include <Arduino.h>
#include "../protocol/i_transport.h"
#include "../protocol/frame.h"
#include "../config.h"

/**
 * @brief Resultado de ejecución de una primitiva de prueba o comando.
 */
struct StepResult {
    uint16_t id;
    bool pass;                     ///< Indica si la operación fue exitosa
    String message;                ///< Descripción o mensaje de diagnóstico
    int measured_position;         ///< Posición medida (si aplica)
    int response_time_ms;          ///< Tiempo de respuesta medido
    unsigned long timestamp_ms = 0;///< Marca de tiempo de ejecución (ms desde arranque)
    bool has_checksum = false;     ///< Indica si el resultado incluye dato de checksum
    uint32_t checksum_value = 0;   ///< Valor de checksum calculado/enviado
    bool checksum_ok = false;      ///< Evaluación básica de checksum en este paso
    bool has_failsafe = false;     ///< Indica si el resultado incluye evaluación de failsafe
    String failsafe_result;        ///< Etiqueta de resultado de failsafe
    bool failsafe_ok = false;      ///< Estado booleano de failsafe
};

/**
 * @class Primitives
 * @brief Abstrae operaciones básicas de comunicación con el actuador.
 * 
 * Permite enviar comandos genéricos sobre un transporte configurable (CAN o UART),
 * incluyendo comandos UDS estándar (Read/Write PID), envío de frames fijos, y funciones
 * auxiliares de control de motor o espera.
 */
class Primitives {
public:
    /**
     * @brief Constructor con transporte inicial.
     * @param t Referencia al transporte (CANTransport o UARTTransport)
     */
    explicit Primitives(ITransport& t);

    /**
     * @brief Cambia dinámicamente el transporte usado (CAN/UART).
     */
    void setTransport(ITransport& t);

    /**
     * @brief Envía un comando de posición al actuador (UDS 0x2E WriteDataByIdentifier).
     * @param position Posición deseada (0–100 %)
     * @param timeout_ms Tiempo máximo de espera de ACK
     * @return StepResult con resultado y tiempo de respuesta
     */
    StepResult commandPosition(int position, int timeout_ms);

    /**
     * @brief Lee un parámetro UDS del actuador (0x22 ReadDataByIdentifier).
     * @param pidMajor Byte alto del PID
     * @param pidMinor Byte bajo del PID
     * @param timeout_ms Tiempo máximo de espera
     */
    StepResult readPID(int pidMajor, int pidMinor, int timeout_ms);

    /**
     * @brief Establece o limpia un bit específico (por ejemplo, Learn Permission, Reset).
     * @param pidMajor Byte alto del PID
     * @param pidMinor Byte bajo del PID
     * @param bit Índice del bit a modificar
     * @param state Nuevo estado del bit (true = 1, false = 0)
     */
    StepResult setFlag(int pidMajor, int pidMinor, int bit, int state);

    /**
     * @brief Apaga el motor y espera su retorno o confirmación.
     * @param pidMajor Byte alto del PID
     * @param pidMinor Byte bajo del PID
     * @param finalPosLimit Posición límite esperada al apagar
     * @param timeout_ms Tiempo máximo de espera
     */
    StepResult motorOff(int pidMajor, int pidMinor, int finalPosLimit, int timeout_ms);

    /**
     * @brief Espera una cantidad de milisegundos (bloqueante).
     * @param ms Tiempo de espera
     */
    StepResult waitMs(int ms);

    /**
     * @brief Envía un frame CAN/UART personalizado, opcionalmente esperando respuesta.
     * @param f Frame con ID, DLC y datos
     * @param expectResp Si se espera respuesta (true por defecto)
     * @param timeout_ms Tiempo máximo de espera
     */
    StepResult customFrame(Frame f, bool expectResp = true, int timeout_ms = 1000);

    /**
     * @brief Crea un resultado StepResult con campos predefinidos.
     */
    StepResult makeResult(bool ok, const String& msg, int pos = -1, int time = 0);

    inline void setId(uint16_t id){ _id = id;}
    inline uint16_t getId(){ return _id;}

private:
    ITransport* _t = nullptr; ///< Transporte activo (CAN o UART)
    // Estado de espera
    unsigned long waitStart = 0;
    uint16_t _id = 0;
    int waitDuration = 0;
    bool waitActive = false;
};
