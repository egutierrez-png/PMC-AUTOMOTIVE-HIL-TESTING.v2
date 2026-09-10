#pragma once
#include "device_status.h"

class ActuatorStatus : public DeviceStatus {
public:
    float temperature = 0; // °C
    float voltage     = 0; // V
    float current     = 0; // A

    virtual const char* deviceType() const override {
        return "ACTUATOR";
    }
};