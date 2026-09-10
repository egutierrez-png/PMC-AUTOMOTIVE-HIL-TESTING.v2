#pragma once
#include <stdint.h>

class DeviceStatus {
public:
    virtual ~DeviceStatus() {}

    // Datos universales
    uint16_t dtc[10];
    uint8_t dtcCount = 0;

    uint16_t flags = 0;

    // Último frame CAN (si aplica)
    uint32_t lastId = 0;
    uint8_t lastFrame[8] = {0};

    // Métodos genéricos
    void clearDtcs() {
        dtcCount = 0;
        for (uint16_t &d : dtc) d = 0;
    }

    void addDtc(uint16_t code) {
        if (dtcCount < 10) dtc[dtcCount++] = code;
    }

    void setLastFrame(uint32_t id, const uint8_t* data) {
        lastId = id;
        for (int i = 0; i < 8; i++) lastFrame[i] = data[i];
    }

    // MÉTODO CLAVE: Los dispositivos concretos lo implementan
    virtual const char* deviceType() const = 0;
};
