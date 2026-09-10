#include "ModbusTCPServerCore.h"

ModbusTCPServerCore::ModbusTCPServerCore(uint16_t port)
    : _server(port),
      _client(),
      _port(port),
      _unitId(1),
      _onReadHolding(nullptr),
      _onWriteSingle(nullptr),
      _onWriteMultiple(nullptr)
{
}

void ModbusTCPServerCore::begin() {
    _server.begin();
}

void ModbusTCPServerCore::loop() {
    if (!_client || !_client.connected()) {
        _client.stop();
        _client = _server.available();
    }

    if (_client && _client.connected()) {
        handleClient();
    }
}

void ModbusTCPServerCore::handleClient() {
    if (!_client.available()) return;

    int len = _client.read(_buffer, MB_TCP_BUFFER_SIZE);
    if (len <= 0) return;

    processRequest(static_cast<size_t>(len));
}

void ModbusTCPServerCore::processRequest(size_t len) {
    if (len < 8) return; // MBAP (7) + 1 byte de funcion

    uint8_t* mbap = _buffer;
    uint16_t transactionId = toU16(&mbap[0]);
    (void)transactionId;
    uint16_t protocolId    = toU16(&mbap[2]);
    uint16_t lengthField   = toU16(&mbap[4]); // unitId + PDU
    uint8_t  unitId        = mbap[6];

    if (protocolId != 0) {
        return; // No es Modbus
    }

    if (len < 7 + 1) return;

    uint8_t* pdu = &_buffer[7];
    uint8_t functionCode = pdu[0];

    uint8_t response[MB_TCP_BUFFER_SIZE];
    memcpy(response, _buffer, 7); // copia MBAP
    uint8_t* respPdu = &response[7];
    size_t   respLen = 0;

    switch (functionCode) {
        case 0x03: { // Read Holding
            if (!_onReadHolding) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x01; // Illegal function
                respLen = 2;
                break;
            }

            if (lengthField < 5) {
                return;
            }
            uint16_t startAddr = toU16(&pdu[1]);
            uint16_t quantity  = toU16(&pdu[3]);

            if (quantity == 0 || quantity > 125) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x03; // Illegal data value
                respLen = 2;
                break;
            }

            uint16_t tmp[125];
            _onReadHolding(startAddr, quantity, tmp);

            respPdu[0] = functionCode;
            respPdu[1] = quantity * 2;
            for (uint16_t i = 0; i < quantity; ++i) {
                fromU16(&respPdu[2 + i * 2], tmp[i]);
            }
            respLen = 2 + quantity * 2;
            break;
        }

        case 0x06: { // Write Single
            if (!_onWriteSingle) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x01;
                respLen = 2;
                break;
            }
            if (lengthField < 5) return;
            uint16_t regAddr = toU16(&pdu[1]);
            uint16_t value   = toU16(&pdu[3]);

            bool ok = _onWriteSingle(regAddr, value);
            if (!ok) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x02; // Illegal data address / error
                respLen = 2;
                break;
            }

            memcpy(respPdu, pdu, 5);
            respLen = 5;
            break;
        }

        case 0x10: { // Write Multiple
            if (!_onWriteMultiple) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x01;
                respLen = 2;
                break;
            }
            if (lengthField < 6) return;

            uint16_t startAddr = toU16(&pdu[1]);
            uint16_t quantity  = toU16(&pdu[3]);
            uint8_t  byteCount = pdu[5];

            if (quantity == 0 || quantity > 123) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x03; // Illegal data value
                respLen = 2;
                break;
            }

            if (byteCount != quantity * 2) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x03; 
                respLen = 2;
                break;
            }

            uint16_t tmp[123];
            for (uint16_t i = 0; i < quantity; ++i) {
                tmp[i] = toU16(&pdu[6 + i * 2]);
            }

            bool ok = _onWriteMultiple(startAddr, tmp, quantity);
            if (!ok) {
                respPdu[0] = functionCode | 0x80;
                respPdu[1] = 0x02;
                respLen = 2;
                break;
            }

            respPdu[0] = functionCode;
            fromU16(&respPdu[1], startAddr);
            fromU16(&respPdu[3], quantity);
            respLen = 5;
            break;
        }

        default: {
            respPdu[0] = functionCode | 0x80;
            respPdu[1] = 0x01; // Illegal function
            respLen = 2;
            break;
        }
    }

    uint16_t respLengthField = static_cast<uint16_t>(1 + respLen);
    fromU16(&response[4], respLengthField);
    response[6] = unitId; // eco del unitId

    size_t totalRespLen = 7 + respLen;
    _client.write(response, totalRespLen);
    _client.flush();
}

