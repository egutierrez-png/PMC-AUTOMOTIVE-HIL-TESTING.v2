#include "ModbusRegisterBank.h"

ModbusRegisterBank::ModbusRegisterBank() {
    for (uint16_t i = 0; i < MAX_REGS; ++i) {
        _regs[i] = 0;
    }
}

uint16_t ModbusRegisterBank::read(uint16_t addr) const {
    if (addr >= MAX_REGS) return 0;
    return _regs[addr];
}

void ModbusRegisterBank::readRange(uint16_t addr, uint16_t quantity, uint16_t* dest) const {
    for (uint16_t i = 0; i < quantity; ++i) {
        dest[i] = read(addr + i);
    }
}

bool ModbusRegisterBank::write(uint16_t addr, uint16_t value) {
    if (addr >= MAX_REGS) return false;
    _regs[addr] = value;
    return true;
}

bool ModbusRegisterBank::writeRange(uint16_t addr, const uint16_t* values, uint16_t quantity) {
    if (addr + quantity > MAX_REGS) return false;
    for (uint16_t i = 0; i < quantity; ++i) {
        _regs[addr + i] = values[i];
    }
    return true;
}

void ModbusRegisterBank::set(uint16_t addr, uint16_t value) {
    if (addr >= MAX_REGS) return;
    _regs[addr] = value;
}

void ModbusRegisterBank::setRange(uint16_t addr, const uint16_t* values, uint16_t quantity) {
    if (addr + quantity > MAX_REGS) return;
    for (uint16_t i = 0; i < quantity; ++i) {
        _regs[addr + i] = values[i];
    }
}

