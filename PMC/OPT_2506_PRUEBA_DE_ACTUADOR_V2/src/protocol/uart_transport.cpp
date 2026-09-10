#include "uart_transport.h"

bool UARTTransport::begin(uint32_t baud) {
    // ⚙️ Usa Serial1 (hardware UART del Portenta Machine Control)
    Serial1.begin(baud);
    delay(100); // Pequeño retardo para estabilizar el puerto

    // ✅ Forma correcta de imprimir (sin printf)
    Serial.print(F("✅ UART inicializado a "));
    Serial.print(baud);
    Serial.println(F(" bps"));

    return true;
}

bool UARTTransport::send(const Frame& frame) {
    if (frame.dlc == 0) return false;  // No hay datos válidos
    Serial1.write(frame.data, frame.dlc);
    char buf[3*8 + 1] = {0}; // "AA " * 8 = 24 chars máx.
    size_t off = 0;
    for (uint8_t i = 0; i < frame.dlc && off + 3 < sizeof(buf); ++i) {
        off += snprintf(buf + off, sizeof(buf) - off, "%02X ", frame.data[i]);
    }
    DEBUG_SERIAL.print(F("UART TX: "));
    DEBUG_SERIAL.println(buf);
    return true;
}

bool UARTTransport::receive(Frame& frame, uint32_t timeout) {
    uint32_t start = millis();
    size_t index = 0;

    while ((millis() - start) < timeout && index < sizeof(frame.data)) {
        if (Serial1.available()) {
            frame.data[index++] = Serial1.read();
        }
    }

    frame.dlc = index;  // ✅ Registrar cantidad de bytes válidos
    ( index > 0) ? DEBUG_SERIAL.println(F("✅ Recibiendo datos del puerto UART!")) : DEBUG_SERIAL.println(F("❌ Timeout de recepción de datos UART excedido!"));

    // Si recibimos algo, asumimos frame completo (puedes agregar verificación CRC o terminador)
    return (index > 0);
}
