#include "can_transport.h"
#include "../runtime_context.h"

static void CanLog(const CanMsg& msg, const char* direction) {
    DEBUG_SERIAL.print(F("["));
    DEBUG_SERIAL.print(direction);
    DEBUG_SERIAL.print(F("] id=0x"));
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

static CanBitRate mapCanBitrate(uint32_t baudrate) {
    switch (baudrate) {
        case 125000: return CanBitRate::BR_125k;
        case 250000: return CanBitRate::BR_250k;
        case 500000: return CanBitRate::BR_500k;
        default:     return CanBitRate::BR_500k;
    }
}

bool CANTransport::begin(uint32_t baudrate) {
#if USE_MACHINECONTROL_CAN
    const CanBitRate rate = mapCanBitrate(baudrate);

    if (!MachineControl_CANComm.begin(rate)) {
        DEBUG_SERIAL.println(F("❌ Error inicializando MachineControl CAN"));
        return false;
    }

    DEBUG_SERIAL.print(F("✅ MachineControl CAN inicializado a "));
    DEBUG_SERIAL.print(baudrate);
    DEBUG_SERIAL.println(F(" bps"));
    return true;

#else
    const CanBitRate rate = mapCanBitrate(baudrate);

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
    CanMsg msg =
        GlobalContext.isCanExtended()
            ? CanMsg(CanExtendedId(frame.id), frame.length(), frame.data)
            : CanMsg(CanStandardId(frame.id), frame.length(), frame.data);

    msg.data_length = frame.length();
    memcpy(msg.data, frame.data, frame.length());

    CanLog(msg, "CAN TX");
    return MachineControl_CANComm.write(msg);

#else
    CanMsg msg;
    msg.id = frame.id;
    msg.data_length = frame.length();
    memcpy(msg.data, frame.data, frame.length());

    #if defined(CAN_MSG_FLAG_EXT)
        msg.flags.extended = GlobalContext.isCanExtended();
    #endif

    CanLog(msg, "CAN TX");
    return CAN.write(msg);
#endif
}

bool CANTransport::receive(Frame& frame, uint32_t timeout) {
#if USE_MACHINECONTROL_CAN
    const uint32_t start = millis();

    while ((millis() - start) < timeout) {
        if (MachineControl_CANComm.available()) {
            CanMsg msg = MachineControl_CANComm.read();

            frame.id  = msg.id;
            frame.dlc = msg.data_length;
            memcpy(frame.data, msg.data, msg.data_length);

            DEBUG_SERIAL.println(F("✅ Recibiendo datos del puerto CAN"));
            CanLog(msg, "CAN RX");
            return true;
        }
    }

    DEBUG_SERIAL.println(F("❌ Timeout de recepción de datos CAN excedido!"));
    return false;

#else
    const uint32_t start = millis();

    while ((millis() - start) < timeout) {
        if (CAN.available()) {
            CanMsg msg = CAN.read();

            frame.id  = msg.id;
            frame.dlc = msg.data_length;
            memcpy(frame.data, msg.data, msg.data_length);

            DEBUG_SERIAL.println(F("✅ Recibiendo datos del puerto CAN"));
            CanLog(msg, "CAN RX");
            return true;
        }
    }

    DEBUG_SERIAL.println(F("❌ Timeout de recepción de datos CAN excedido!"));
    return false;
#endif
}

bool CANTransport::isConnected() const {
#if USE_MACHINECONTROL_CAN
    return true;
#else
    return true;
#endif
}