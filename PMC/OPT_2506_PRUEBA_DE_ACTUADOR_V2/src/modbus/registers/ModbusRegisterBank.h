#pragma once
#include <stdint.h>

/**
 * Banco genérico de Holding Registers para Modbus.
 * No conoce TestEngine ni GlobalContext.
 */

class ModbusRegisterBank {
public:
    static constexpr uint16_t MAX_REGS = 512;

    ModbusRegisterBank();

    uint16_t read(uint16_t addr) const;
    void     readRange(uint16_t addr, uint16_t quantity, uint16_t* dest) const;

    bool     write(uint16_t addr, uint16_t value);
    bool     writeRange(uint16_t addr, const uint16_t* values, uint16_t quantity);

    void     set(uint16_t addr, uint16_t value); // sin validación, interno
    void     setRange(uint16_t addr, const uint16_t* values, uint16_t quantity);

private:
    uint16_t _regs[MAX_REGS];
};

