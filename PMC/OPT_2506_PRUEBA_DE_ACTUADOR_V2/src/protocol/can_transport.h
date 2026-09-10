#pragma once
#include <Arduino.h>
#include "../config.h"
#include "i_transport.h"
#include "frame.h"

/**
 * @file can_transport.h
 * @brief Implementación híbrida de transporte CAN compatible con Portenta Machine Control
 *        y plataformas genéricas que usan la librería Arduino_CAN.
 *
 * Esta clase detecta automáticamente el entorno de compilación:
 *  - Si existe <Arduino_PortentaMachineControl.h>, usa MachineControl_CANComm
 *  - En caso contrario, usa Arduino_CAN
 *
 * Permite que el mismo firmware funcione en Portenta H7, Teensy, STM32 o cualquier MCU
 * con soporte CAN.
 */

#if __has_include(<Arduino_PortentaMachineControl.h>)
  #include <Arduino_PortentaMachineControl.h>
  #define USE_MACHINECONTROL_CAN 1
#else
  #include <Arduino_CAN.h>
  #define USE_MACHINECONTROL_CAN 0
#endif

class CANTransport : public ITransport {
public:
    /**
     * @brief Inicializa el bus CAN con el baudrate especificado.
     * @param baudrate Velocidad del bus en bits por segundo (bps).
     * @return true si se inicializó correctamente, false en caso de error.
     */
    bool begin(uint32_t baudrate = 500000) override;

    /**
     * @brief Envía un frame CAN.
     * @param frame Estructura Frame con ID, DLC y datos.
     * @return true si el envío fue exitoso.
     */
    bool send(const Frame& frame) override;

    /**
     * @brief Espera la recepción de un frame CAN.
     * @param frame Referencia donde se almacenará el frame recibido.
     * @param timeout_ms Tiempo máximo de espera en milisegundos.
     * @return true si se recibió un frame válido antes del timeout.
     */
    bool receive(Frame& frame, uint32_t timeout_ms) override;

    /**
     * @brief Verifica si el bus sigue activo.
     * @return true si está operativo, false si entró en BUS_OFF.
     */
    bool isConnected() const override;
};

