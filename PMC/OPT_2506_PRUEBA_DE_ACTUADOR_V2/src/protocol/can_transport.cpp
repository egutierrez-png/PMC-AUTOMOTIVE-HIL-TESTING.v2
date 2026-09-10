#include "can_transport.h"
#include "../mqtt/mqtt_client.h"


static void CanLog(CanMsg msg,char* direction){
     // Log legible
     DEBUG_SERIAL.print(F(direction));
    DEBUG_SERIAL.print(F(" id=0x"));
    DEBUG_SERIAL.print(msg.id, HEX);
    DEBUG_SERIAL.print(F(" dlc="));
    DEBUG_SERIAL.print(msg.data_length);
    DEBUG_SERIAL.print(F(" data: "));

    uint8_t dlc = msg.data_length > 8 ? 8 : msg.data_length;
    
    for (uint8_t i = 0; i < dlc; ++i) {
        if (msg.data[i] < 0x10) DEBUG_SERIAL.print('0');
        DEBUG_SERIAL.print(msg.data[i], HEX);
        if (i + 1 < dlc) DEBUG_SERIAL.print(' ');
    }
    DEBUG_SERIAL.println();
}


bool CANTransport::begin(uint32_t baudrate) {
#if USE_MACHINECONTROL_CAN
    // ===============================================================
    // Portenta Machine Control
    // ===============================================================
    if (!MachineControl_CANComm.begin(CanBitRate::BR_500k)) {
        DEBUG_SERIAL.println(F("❌ Error inicializando MachineControl CAN"));
        return false;
    }
    DEBUG_SERIAL.println(F("✅ MachineControl CAN inicializado (500 kbps)"));
    return true;

#else
    // ===============================================================
    // Fallback: Arduino_CAN (Portenta H7 sin PMC, Teensy, etc.)
    // ===============================================================
    CanBitRate rate;
    switch (baudrate) {
        case 125000: rate = CanBitRate::BR_125k; break;
        case 250000: rate = CanBitRate::BR_250k; break;
        case 500000: rate = CanBitRate::BR_500k; break;
        case 1000000: rate = CanBitRate::BR_1M; break;
        default: rate = CanBitRate::BR_500k; break;
    }

    if (!CAN.begin(rate)) {
        DEBUG_SERIAL.println(F("❌ Error inicializando Arduino_CAN"));
        return false;
    }

    DEBUG_SERIAL.print(F("✅ Arduino_CAN inicializado a "));
    DEBUG_SERIAL.print(baudrate);
    DEBUG_SERIAL.println(F(" bps"));
    return true;
#endif
}

bool CANTransport::send(const Frame& frame) {
#if USE_MACHINECONTROL_CAN
    CanMsg msg;
    msg.id = frame.id;
    msg.data_length = frame.length();
    memcpy(msg.data, frame.data, frame.length());
    CanLog(msg,"CAN TX");
    return MachineControl_CANComm.write(msg);

#else
    CanMsg msg;
    msg.id = frame.id;
    msg.data_length = frame.length();
    memcpy(msg.data, frame.data, frame.length());

    // Compatibilidad con versiones que todavía usan "flags" o "format"
    #if defined(ARDUINO_PORTENTA_H7_M7)
        // Librerías nuevas ya no necesitan setear nada
    #elif defined(CAN_MSG_FLAG_EXT)
        msg.flags.extended = false;
    #endif
    CanLog(msg,"CAN RX");
    return CAN.write(msg);
#endif
gMqtt->publishRawCAN(frame.id, frame.data, frame.length());
}

bool CANTransport::receive(Frame& frame, uint32_t timeout) {
#if USE_MACHINECONTROL_CAN
    uint32_t start = millis();
    while ((millis() - start) < timeout) {
        if (MachineControl_CANComm.available()) {
            DEBUG_SERIAL.println(F("✅ Recibiendo datos del puerto CAN!"));
            CanMsg msg = MachineControl_CANComm.read();
            frame.id = msg.id;
            frame.dlc = msg.data_length;
            memcpy(frame.data, msg.data, msg.data_length);
            CanLog(msg,"CAN TX");
            return true;
        }
    }
    DEBUG_SERIAL.println(F("❌ Timeout de recepción de datos CAN excedido!"));
    return false;

#else
    uint32_t start = millis();
    while ((millis() - start) < timeout) {
        if (CAN.available()) {
            DEBUG_SERIAL.println(F("✅ Recibiendo datos del puerto CAN!"));
            CanMsg msg = CAN.read();
            frame.id = msg.id;
            frame.dlc = msg.data_length;
            memcpy(frame.data, msg.data, msg.data_length);
            CanLog(msg,"CAN RX");
            return true;
        }
    }
    DEBUG_SERIAL.println(F("❌ Timeout de recepción de datos CAN excedido!"));
    return false;
#endif
gMqtt->publishRawCAN(frame.id, frame.data, frame.length());
}

bool CANTransport::isConnected() const {
#if USE_MACHINECONTROL_CAN
    return true;  // PMC no expone estado del bus
#else
    // No hay API equivalente a CAN.state() en mbed 4.x → asumimos activo
    return true;
#endif
}

