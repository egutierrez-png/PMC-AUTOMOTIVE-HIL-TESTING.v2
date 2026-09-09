#include "ModbusPMCAdapter.h"


ModbusPMCAdapter::ModbusPMCAdapter(ModbusRegisterBank& bank, TestEngine& engine)
    : _bank(bank),
      _engine(engine)
{
}

void ModbusPMCAdapter::initStaticRegisters() {
    _bank.set(REG_DEVICE_TYPE, 1);   // 1 = PMC Tester
    _bank.set(REG_FW_MAJOR, 1);
    _bank.set(REG_FW_MINOR, 0);
}

void ModbusPMCAdapter::refreshDynamicRegisters() {
    // RunMode
    RunMode rm = GlobalContext.getRunMode();
    switch (rm) {
        case RunMode::AUTO:   _bank.set(REG_RUN_MODE, 1); break;
        case RunMode::MANUAL: _bank.set(REG_RUN_MODE, 2); break;
        default:              _bank.set(REG_RUN_MODE, 0); break;
    }

    // Protocolo
    ProtocolType pt = GlobalContext.getProtocol();
    _bank.set(REG_PROTOCOL_TYPE, (pt == ProtocolType::UART) ? 1 : 0);

    // Family hash
    String fam = GlobalContext.getActiveFamily();
    _bank.set(REG_ACTIVE_FAMILY_ID, hash16(fam.c_str()));

    // Heartbeat simple
    uint16_t hb = _bank.read(REG_HEARTBEAT);
    _bank.set(REG_HEARTBEAT, hb + 1);

    // Snapshot del engine
    const auto snap = _engine.snapshot();

    // EngineState
    switch (snap.state) {
        case EngineState::IDLE:    _bank.set(REG_ENGINE_STATE, ENG_IDLE);    break;
        case EngineState::RUNNING: _bank.set(REG_ENGINE_STATE, ENG_RUNNING); break;
        case EngineState::ERROR:   _bank.set(REG_ENGINE_STATE, ENG_ERROR);   break;
        case EngineState::DONE:    _bank.set(REG_ENGINE_STATE, ENG_DONE);    break;
        default:                   _bank.set(REG_ENGINE_STATE, ENG_IDLE);    break;
    }

    _bank.set(REG_CURRENT_STEP, snap.current_step);
    _bank.set(REG_TOTAL_STEPS,  snap.total_steps);

    // PASS/FAIL y mediciones – por ahora placeholders seguros.
    // =============================
    // OBTENER RESULTADO DEL PASO
    // =============================
    StepResult r = _engine.getLastStepResult();

    // PASS / FAIL
    if (snap.state == EngineState::RUNNING || snap.state == EngineState::DONE) {
        _bank.set(REG_PASS_FAIL, r.pass ? 1 : 2);
    } else {
        _bank.set(REG_PASS_FAIL, 0);  // unknown
    }

    // Tiempo de respuesta
    _bank.set(REG_RESPONSE_TIME_MS, (uint16_t) r.response_time_ms);

    // Valor medido POSITIVO escalado x100
    float rawValue = r.measured_position;
    if (rawValue < 0) rawValue = 0;   // Seguridad industrial (no negativos)

    uint16_t scaled = (uint16_t)(rawValue * 100.0f);
    _bank.set(REG_MEASURE_VALUE, scaled);

    // Unidad (aquí eliges tú)
    _bank.set(REG_MEASURE_UNIT, UNIT_POSITION); 

    // Estado del step
    if (!r.pass) {
        _bank.set(REG_STEP_STATUS, STEP_OUT_OF_RANGE);
    } else {
        _bank.set(REG_STEP_STATUS, STEP_OK);
    }

    // Info de receta / perfil
    if (GlobalContext.hasRecipe()) {
        const Recipe& r = GlobalContext.getRecipe();
        _bank.set(REG_JOB_ID_HASH,     hash16(r.job_id.c_str()));
        _bank.set(REG_SERIAL_HASH,     hash16(r.serial.c_str()));
        _bank.set(REG_STEPS_COUNT,     r.steps.size());

        String profile = GlobalContext.getProfile();
        DynamicJsonDocument doc(10 * 1024);
        auto err = deserializeJson(doc, profile);
        if (err) {
            DEBUG_SERIAL.println(F("❌ Error JSON perfil"));
            _bank.set(REG_PROFILE_ID_HASH, hash16("error"));
        }
        const char* schema = doc["schema"] | "";
        const char* name   = doc["name"]   | "UNKNOWN";
        _bank.set(REG_PROFILE_ID_HASH, hash16(name));
    } else {
        _bank.set(REG_JOB_ID_HASH,     0);
        _bank.set(REG_SERIAL_HASH,     0);
        _bank.set(REG_STEPS_COUNT,     0);
        _bank.set(REG_PROFILE_ID_HASH, 0);
    }

    // ==== Extraer desde GlobalContext.actuator =====
    auto& a = GlobalContext.actuator;

    // ---- Temperature ----
    uint16_t tempScaled = (uint16_t)(a.temperature * 100);
    _bank.set(0x0410, tempScaled);

    // ---- Voltage ----
    uint16_t voltScaled = (uint16_t)(a.voltage * 100);
    _bank.set(0x0411, voltScaled);

    // ---- Current ----
    uint16_t currScaled = (uint16_t)(a.current * 100);
    _bank.set(0x0412, currScaled);

    // ---- Flags ----
    _bank.set(0x0420, a.flags);

    // ---- DTC Count ----
    _bank.set(0x0400, a.dtcCount);

    // ---- DTC List ----
    for (int i = 0; i < a.dtcCount; i++) {
        _bank.set(0x0401 + i, a.dtc[i]);
    }

    // ---- Last CAN frame ----
    _bank.set(0x0430, (uint16_t)(a.lastId & 0xFFFF));

    _bank.set(0x0431, (a.lastFrame[0] << 8) | a.lastFrame[1]);
    _bank.set(0x0432, (a.lastFrame[2] << 8) | a.lastFrame[3]);
    _bank.set(0x0433, (a.lastFrame[4] << 8) | a.lastFrame[5]);
    _bank.set(0x0434, (a.lastFrame[6] << 8) | a.lastFrame[7]);
}

// ============================================================
//  Callbacks para el core ModbusTCPServerCore
// ============================================================

void ModbusPMCAdapter::onReadHolding(uint16_t addr, uint16_t quantity, uint16_t* dest) {
    // Antes de leer, refrescamos los registros dinámicos
    refreshDynamicRegisters();
    _bank.readRange(addr, quantity, dest);
}

bool ModbusPMCAdapter::onWriteHoldingSingle(uint16_t addr, uint16_t value) {
    // Comandos especiales
    if (addr == REG_COMMAND) {
        // Guardamos el param actual (por si el comando lo usa)
        _bank.set(REG_COMMAND, 0); // auto-clear
        _bank.set(REG_COMMAND_STATUS, CMD_STATUS_OK);

        handleCommand(value);
        return true;
    }

    // Parámetro de comando
    if (addr == REG_COMMAND_PARAM) {
        return _bank.write(addr, value);
    }

    // Otros registros RW (si decides exponer alguno extra)
    // Por defecto, no aceptar escritura fuera de zona de comandos.
    return false;
}

bool ModbusPMCAdapter::onWriteHoldingMultiple(uint16_t addr, const uint16_t* values, uint16_t quantity) {
    // Manejar múltiples escrituras; la más típica será incluir REG_COMMAND
    for (uint16_t i = 0; i < quantity; ++i) {
        uint16_t a = addr + i;
        uint16_t v = values[i];
        if (!onWriteHoldingSingle(a, v)) {
            return false;
        }
    }
    return true;
}

// ============================================================
//  Lógica de comandos (start, abort, modos, reset, etc.)
// ============================================================

void ModbusPMCAdapter::handleCommand(uint16_t cmd) {
    switch (cmd) {
        case CMD_NONE:
            return;

        case CMD_START: {
            if (GlobalContext.getRunMode() == RunMode::MANUAL) {
                // No permitir start en MANUAL
                _bank.set(REG_COMMAND_STATUS, CMD_STATUS_ERROR);
                return;
            }
            _engine.start();
            return;
        }

        case CMD_ABORT: {
            _engine.abort();
            return;
        }

        case CMD_SET_MODE_AUTO: {
            GlobalContext.setRunMode(RunMode::AUTO);
            return;
        }

        case CMD_SET_MODE_MANUAL: {
            if (_engine.state() == EngineState::RUNNING) {
                _engine.abort();
            }
            GlobalContext.setRunMode(RunMode::MANUAL);
            return;
        }

        case CMD_RUN_SINGLE_STEP: {
            if (!GlobalContext.isAuto()) {
                int stepIndex = _bank.read(REG_COMMAND_PARAM); // 1-based?
                if (stepIndex > 0) {
                    _engine.runSingleStep(stepIndex - 1);
                } else {
                    _bank.set(REG_COMMAND_STATUS, CMD_STATUS_INVALID);
                }
            } else {
                _bank.set(REG_COMMAND_STATUS, CMD_STATUS_ERROR);
            }
            return;
        }

        case CMD_RESET_DEVICE: {
            NVIC_SystemReset();
            return; // no vuelve
        }

        // case CMD_STATUS_ONLINE: {
        //     // Opcional: disparar initMessage de MQTT
        //     if (gMqtt) {
        //         gMqtt->initMessage();
        //     }
        //     return;
        // }

        default:
            _bank.set(REG_COMMAND_STATUS, CMD_STATUS_INVALID);
            return;
    }
}

