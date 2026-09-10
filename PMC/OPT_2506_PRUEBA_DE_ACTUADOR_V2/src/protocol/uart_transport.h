#pragma once
#include <Arduino.h>
#include "../config.h"
#include "i_transport.h"
#include "frame.h"

/**
 * @file uart_transport.h
 * @brief Implementación concreta de la interfaz ITransport para comunicación UART.
 *
 * Esta clase encapsula la transmisión y recepción de tramas (Frame) a través
 * del puerto UART físico del Portenta Machine Control (Serial1).
 *
 * Ejemplo de uso:
 * @code
 * UARTTransport uartBus(Serial1);
 * uartBus.begin(115200);
 *
 * Frame f;
 * f.dlc = 8;
 * memcpy(f.data, "\xAA\x55\x01\x02\x03\x04\x05\x06", 8);
 * uartBus.send(f);
 * @endcode
 */
class UARTTransport : public ITransport {
public:
    /**
     * @brief Constructor que recibe una referencia al puerto serial deseado.
     * @param serial Puerto serial físico (por ejemplo, Serial1 en Portenta).
     */
    explicit UARTTransport(HardwareSerial& serial)
        : _serial(serial) {}

    /**
     * @brief Inicializa el puerto UART con el baudrate especificado.
     * @param baudrate Velocidad del puerto en bps (por defecto 115200).
     * @return true si se inicializó correctamente.
     */
    bool begin(uint32_t baudrate = 115200) override;

    /**
     * @brief Envía un frame de datos a través del puerto UART.
     * @param frame Frame con datos y longitud (dlc).
     * @return true si el envío fue exitoso.
     */
    bool send(const Frame& frame) override;

    /**
     * @brief Espera la recepción de un frame UART.
     * @param frame Frame donde se guardarán los datos recibidos.
     * @param timeout_ms Tiempo máximo de espera en milisegundos.
     * @return true si se recibió algo, false si hubo timeout.
     */
    bool receive(Frame& frame, uint32_t timeout_ms) override;

    /**
     * @brief Indica si el puerto serial sigue activo.
     */
    bool isConnected() const override { return true; }

private:
    HardwareSerial& _serial; ///< Referencia al puerto UART físico.
};
