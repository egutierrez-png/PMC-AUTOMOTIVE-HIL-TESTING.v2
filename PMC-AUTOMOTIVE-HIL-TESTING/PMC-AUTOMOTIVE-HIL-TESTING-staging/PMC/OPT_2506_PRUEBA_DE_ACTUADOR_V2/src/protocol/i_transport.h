#pragma once
#include <Arduino.h>
#include "frame.h"

/**
 * @file i_transport.h
 * @brief Interfaz abstracta para las capas de transporte (CAN / UART).
 * 
 * Define los métodos comunes para enviar y recibir frames,
 * independientemente del bus físico usado. Cada implementación
 * concreta (por ejemplo, CANTransport o UARTTransport) debe
 * implementar estos métodos.
 */
class ITransport {
public:
    virtual ~ITransport() = default;

    /**
     * @brief Inicializa el bus de comunicación.
     * @param baudrate Velocidad del bus en bits por segundo (bps).
     * @return true si se inicializó correctamente, false en caso contrario.
     */
    virtual bool begin(uint32_t baudrate = 115200) = 0;

    /**
     * @brief Envía un frame de datos a través del bus activo.
     * @param frame Referencia constante al frame que se enviará.
     * @return true si el envío fue exitoso, false si falló.
     */
    virtual bool send(const Frame& frame) = 0;

    /**
     * @brief Recibe un frame de datos desde el bus activo.
     * @param frame Referencia donde se almacenará el frame recibido.
     * @param timeout_ms Tiempo máximo de espera en milisegundos.
     * @return true si se recibió un frame válido antes del timeout, false en caso contrario.
     */
    virtual bool receive(Frame& frame, uint32_t timeout_ms) = 0;

    /**
     * @brief (Opcional) Verifica si el bus sigue activo.
     * @return true si está conectado, false si no (implementación opcional).
     */
    virtual bool isConnected() const { return true; }
};
