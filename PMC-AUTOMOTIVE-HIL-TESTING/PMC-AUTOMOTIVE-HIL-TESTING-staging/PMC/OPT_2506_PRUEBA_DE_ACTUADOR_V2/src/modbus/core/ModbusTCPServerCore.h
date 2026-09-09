#pragma once
#include <Arduino.h>
#include <Ethernet.h>
#include <functional>

/**
 * ============================================================
 *              ModbusTCPServerCore (Genérico)
 * ============================================================
 * - Implementa el protocolo Modbus TCP:
 *    - MBAP header
 *    - Funciones 0x03, 0x06, 0x10
 * - NO conoce nada de registros ni de tu aplicación.
 * - Usa callbacks para leer/escribir Holding Registers.
 * ============================================================
 */

class ModbusTCPServerCore {
public:
    static constexpr size_t MB_TCP_BUFFER_SIZE = 260;

    using ReadHoldingCallbackRange = std::function<void(uint16_t addr, uint16_t quantity, uint16_t* dest)>;
    using WriteHoldingSingleCallback = std::function<bool(uint16_t addr, uint16_t value)>;
    using WriteHoldingMultipleCallback = std::function<bool(uint16_t addr, const uint16_t* values, uint16_t quantity)>;

    ModbusTCPServerCore(uint16_t port);

    void begin();
    void loop();

    void setUnitId(uint8_t id) { _unitId = id; }

    // Callbacks de aplicación
    void onReadHolding(ReadHoldingCallbackRange cb)    { _onReadHolding = cb; }
    void onWriteHoldingSingle(WriteHoldingSingleCallback cb) { _onWriteSingle = cb; }
    void onWriteHoldingMultiple(WriteHoldingMultipleCallback cb) { _onWriteMultiple = cb; }

private:
    EthernetServer _server;
    EthernetClient _client;
    uint16_t       _port;
    uint8_t        _unitId;

    uint8_t _buffer[MB_TCP_BUFFER_SIZE];

    ReadHoldingCallbackRange      _onReadHolding;
    WriteHoldingSingleCallback    _onWriteSingle;
    WriteHoldingMultipleCallback  _onWriteMultiple;

    void handleClient();
    void processRequest(size_t len);

    static uint16_t toU16(const uint8_t* p) {
        return (static_cast<uint16_t>(p[0]) << 8) | p[1];
    }
    static void fromU16(uint8_t* p, uint16_t v) {
        p[0] = (v >> 8) & 0xFF;
        p[1] = v & 0xFF;
    }
};

