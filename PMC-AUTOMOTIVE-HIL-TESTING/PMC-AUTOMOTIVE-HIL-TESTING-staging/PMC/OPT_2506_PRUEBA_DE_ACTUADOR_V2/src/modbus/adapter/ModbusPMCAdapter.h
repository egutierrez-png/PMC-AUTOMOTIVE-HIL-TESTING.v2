#pragma once
#include <Arduino.h>
#include "../../runtime_context.h"
#include "../../engine/test_engine.h"
#include "../../mqtt/mqtt_client.h"   // para gMqtt si quieres usar initMessage()
#include "../ModbusRegisterMap.h"
#include "../registers/ModbusRegisterBank.h"


/**
 * ============================================================
 *         Adaptador PMC ↔ Banco de Registros Modbus
 * ============================================================
 * - Lógica de mapeo:
 *    - snapshot() del engine → registros RO
 *    - comandos Modbus (REG_COMMAND) → start/abort/etc.
 * ============================================================
 */
class ModbusPMCAdapter {
public:
    ModbusPMCAdapter(ModbusRegisterBank& bank, TestEngine& engine);

    // Inicializa registros estáticos (device type, versión, etc.)
    void initStaticRegisters();

    // Refresca los registros dinámicos desde GlobalContext + Engine
    void refreshDynamicRegisters();

    // Callbacks a conectar con ModbusTCPServerCore:
    void onReadHolding(uint16_t addr, uint16_t quantity, uint16_t* dest);
    bool onWriteHoldingSingle(uint16_t addr, uint16_t value);
    bool onWriteHoldingMultiple(uint16_t addr, const uint16_t* values, uint16_t quantity);

private:
    ModbusRegisterBank& _bank;
    TestEngine&         _engine;

    // Helpers
    void handleCommand(uint16_t cmd);
};

