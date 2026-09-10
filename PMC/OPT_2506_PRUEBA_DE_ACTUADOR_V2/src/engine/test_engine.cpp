#include "test_engine.h"
#include "family_manager.h"
#include "../runtime_context.h"

TestEngine::TestEngine(Primitives& p) : _p(p) {}

void TestEngine::processWait(int step_ms) {
    // Primera vez: inicializa el temporizador
    if (!_waitActive) {
        unsigned long now = millis();
        _waitEndTime = now + (unsigned long) step_ms;
        _waitActive = true;
        return;     // NO hacer nada más por ahora
    }

    // Ya estamos esperando, revisar si ya venció
    unsigned long now = millis();
    if ((long)(now - _waitEndTime) < 0) {
        return;     // Aún no termina, seguir esperando
    }

    // Tiempo cumplido → generar resultado y avanzar
    StepResult r = _p.makeResult(
        true,
        String("Wait complete (") + String(step_ms) + " ms)",
        -1,
        step_ms
    );

    _results.push_back(r);
    _idx++;             // avanzar al siguiente paso
    _p.setId(_idx);
     if (_pastIdx != _idx) {
        touchStatus();
        _pastIdx = _idx;
    }
    _stepStart = millis();
    _waitActive = false;
}


EngineSnapshot TestEngine::snapshot() const {
    EngineSnapshot s;
    s.state        = _state;
    s.job_id       = _recipe.job_id;
    s.serial       = _recipe.serial;
    s.current_step = _idx+1;
    s.total_steps  = _recipe.steps.size();
    s.monotonic    = _monotonic;   // cambia cuando hay nuevo estado/resultado
    return s;
}

StepResult TestEngine::getLastStepResult() const {
    if (!_results.empty()) {
        return _results.back();   // Paso automático
    }

    // Si no hay resultados automáticos pero sí manuales
    if (_manualResultValid) {
        return _manualResult;
    }

    // Si no hay nada, regresamos un StepResult vacío
    StepResult empty;
    empty.pass = false;
    empty.message = "No result yet";
    empty.response_time_ms = 0;
    empty.measured_position = 0;
    return empty;
}

bool TestEngine::loadRecipe(const Recipe& r) {
    _recipe = r;
    _results.clear();
    _idx = 0;
    _p.setId(_idx);
    _state = EngineState::IDLE;
    touchStatus();      // hay nuevo estado para reportar
    return true;
}

void TestEngine::start() {
    if (_recipe.steps.empty()){
        DEBUG_SERIAL.println(F("❌ No hay receta disponible! Abortando..."));
        errorDetail = "No hay receta disponible";
        _state = EngineState::ERROR;
        touchStatus();      // hay nuevo estado para reportar
        return;
    } 
    touchStatus();      // hay nuevo estado para reportar
    _state = EngineState::RUNNING;
    DEBUG_SERIAL.println("Iniciando secuencia con cantidad de pasos: "+String(_recipe.steps.size()));
    _idx = 0;
    _p.setId(_idx);
    _stepStart = millis();
}

void TestEngine::tick() {
    if (GlobalContext.isManual()) {
        _state = EngineState::IDLE;   // o EngineState::IDLE, según tu flujo
        //touchStatus();
        return; // no avanzar automáticamente
    }
    if (_state != EngineState::RUNNING) return;
    if (_idx >= _recipe.steps.size()) {
        _state = EngineState::DONE;
        touchStatus();
        touchResult();    // habrá resultado final
        return;
    }

    if (_abortRequested) {
        // TODO: aquí apaga salidas/manda a estado seguro si aplica
        _state = EngineState::IDLE;   // o EngineState::IDLE, según tu flujo
        touchStatus();
        touchResult();    // habrá resultado final
        _abortRequested = false;      // limpia el flag si corresponde
        return;
    }

    Step step = _recipe.steps[_idx];
    StepResult res;
#if SIMULATION_MODE
    // -----------------------------------------------------
    // Modo simulación (sin hardware real)
    // -----------------------------------------------------
    res.pass = true;
    res.measured_position = step.position;
    res.response_time_ms = random(100, 250);
    res.message = "Simulated step";

#else

    // ---------------------------------------
    // 1) PRIMERO checkear si estamos en WAIT
    // ---------------------------------------
    if (step.action == Action::WAIT) {
        processWait(step.duration_ms);
        return;  // 👈 VERY IMPORTANT
    }
    // -----------------------------------------------------
    // Modo real: ejecuta acción según tipo
    // -----------------------------------------------------
    switch (step.action) {
        case Action::COMMAND_POSITION:
            res = _p.commandPosition(step.position, step.timeout_ms);
            break;

        case Action::MOTOR_OFF:
            res = _p.motorOff(step.pid_major, step.pid_minor,
                              step.final_position_less_than, step.timeout_ms);
            break;
        // =====================================================
        // NUEVOS TIPOS DE ACCIÓN (familias CAN o avanzadas)
        // =====================================================

        // 1️⃣ CUSTOM_FRAME
        // Enviar frame CAN fijo (VTG/WG) sin depender de PID/UDS
        case Action::CUSTOM_FRAME: {
            Frame f;
            f.id = step.frame_id;
            f.dlc = 8;
            memcpy(f.data, step.frame_data, 8);
            res = _p.customFrame(f, step.expect_response, step.timeout_ms);
            break;
        }

        // 2️⃣ SET_FLAG
        // Cambiar bits específicos (Learn Permission, Reset, etc.)
        case Action::SET_FLAG:
            res = _p.setFlag(step.pid_major, step.pid_minor,
                             step.bit_index, step.bit_state);
            break;

        // 3️⃣ READ_PID
        // Lectura directa de parámetros UDS (por ejemplo, temperatura o error code)
        case Action::READ_PID:
            res = _p.readPID(step.pid_major, step.pid_minor, step.timeout_ms);
            break;

        // 4️⃣ CLEAR_CODES
        // Borrar códigos de error/falla (usando frame o PID)
        case Action::CLEAR_CODES: {
            // Si tu familia usa frames CAN fijos, usa CUSTOM_FRAME en su lugar.
            // Aquí usamos un PID genérico 0x55/0x56 (fault/error) como ejemplo.
            res = _p.setFlag(0x55, 0x00, 0, 0); // placeholder
            res.message = "Clear codes (placeholder)";
            break;
        }

        // -----------------------------------------------------
        // Acción desconocida
        // -----------------------------------------------------
        default:
            res.pass = false;
            res.message = "Unknown or unsupported action";
            break;
    }
#endif

    // Guarda el resultado del paso actual
    _results.push_back(res);
    _idx++;
    _p.setId(_idx);
    if(_pastIdx != _idx){
        touchStatus();
        _pastIdx = _idx;
    }
    _stepStart = millis();


    // Si ya se completaron todos los pasos, termina la receta
    if (_idx >= _recipe.steps.size()) {
        _idx = 0;
        _state = EngineState::DONE;
        touchStatus();
        touchResult();    // habrá resultado final
    }
}

void TestEngine::runSingleStep(int stepIndex) {
    if (_state == EngineState::RUNNING) {
        DEBUG_SERIAL.println(F("⚠️ No puedes ejecutar step manual mientras RUNNING"));
        return;
    }

    // 1) Validaciones
    if (stepIndex < 0 || stepIndex >= _recipe.steps.size()) {
        DEBUG_SERIAL.println(F("❌ runSingleStep: stepIndex fuera de rango"));
        return;
    }

    if (_state == EngineState::RUNNING) {
        DEBUG_SERIAL.println(F("❌ runSingleStep: no permitido mientras RUNNING"));
        return;
    }

    DEBUG_SERIAL.print(F("🔧 Ejecutando paso manual: "));
    DEBUG_SERIAL.println(stepIndex);

    Step step = _recipe.steps[stepIndex];
    _lastManualStep = stepIndex+1;     // << NUEVO
    StepResult res;

    // 2) Manejar WAIT (con su máquina de estado actual)
    if (step.action == Action::WAIT) {

        DEBUG_SERIAL.println(F("⏱ Ejecutando WAIT manualmente..."));

        // RESET del estado de wait
        _waitActive = false;

        // Simular tick() para WAIT: primera llamada inicializa, segunda completa
        processWait(step.duration_ms);   // inicia conteo
        delay(step.duration_ms + 5);     // dejamos que expire
        processWait(step.duration_ms);   // fuerza resultado

        // El resultado ya quedó guardado en _results por processWait
        // pero NO queremos contaminar results automáticos → lo extraemos
        res = _results.back();
        _results.pop_back();
    }
    else {

        // 3) Acciones normales (idéntico a tick)
        switch (step.action) {

            case Action::COMMAND_POSITION:
                res = _p.commandPosition(step.position, step.timeout_ms);
                break;

            case Action::MOTOR_OFF:
                res = _p.motorOff(step.pid_major, step.pid_minor,
                                   step.final_position_less_than, step.timeout_ms);
                break;

            case Action::CUSTOM_FRAME: {
                Frame f;
                f.id = step.frame_id;
                f.dlc = 8;
                memcpy(f.data, step.frame_data, 8);
                res = _p.customFrame(f, step.expect_response, step.timeout_ms);
                break;
            }

            case Action::SET_FLAG:
                res = _p.setFlag(step.pid_major, step.pid_minor,
                                 step.bit_index, step.bit_state);
                break;

            case Action::READ_PID:
                res = _p.readPID(step.pid_major, step.pid_minor, step.timeout_ms);
                break;

            default:
                res.pass = false;
                res.message = "Unsupported action in manual mode";
        }
    }

    // 4) PUBLICAR resultado directo
    _manualResult = res;       // ← nuevo: guardamos un resultado manual
    touchManualResult();       // ← marca dirty para MQTT
    _manualResultValid = true;

    DEBUG_SERIAL.println(F("🟢 Paso manual ejecutado y listo para publicar"));
}
