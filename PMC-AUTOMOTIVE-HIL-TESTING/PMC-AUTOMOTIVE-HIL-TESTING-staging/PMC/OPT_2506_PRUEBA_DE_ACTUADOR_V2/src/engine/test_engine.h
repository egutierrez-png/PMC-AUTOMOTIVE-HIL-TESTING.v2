#pragma once
#include <Arduino.h>
#include <vector>
#include "primitives.h"
#include "recipe.h"
#include "../utils/checksum_utils.h"

/**
 * TestEngine
 * ----------
 * Ejecuta paso a paso la receta cargada (Recipe).
 * Cada Step define una acción (Action) que se traduce a una primitiva (CAN, UART, etc.).
 * 
 * Compatible con:
 *  - UDS por CAN (Read/Write PID)
 *  - Frames CAN fijos (VTG/WG)
 *  - Simulación (SIMULATION_MODE)
 * 
 * Se integra con:
 *  - FamilyManager (para saber qué familia está activa)
 *  - Primitives (para enviar comandos genéricos)
 */

enum class EngineState {
    IDLE,
    RUNNING,
    ERROR,
    DONE
};

struct EngineSnapshot {
  EngineState state;
  String job_id;
  String serial;
  size_t current_step;
  size_t total_steps;
  uint32_t monotonic;   // contador que cambia cuando hay nueva info
};

// =========================================================
// CLASE PRINCIPAL
// =========================================================
class TestEngine {
public:
    explicit TestEngine(Primitives& p);

    EngineSnapshot snapshot() const;

    // Señales de “hay algo que publicar”
    bool statusDirty()  const { return _statusDirty; }
    bool resultDirty()  const { return _resultDirty; }

    // Ya no hay “markReported()” genérico; se limpian flags explícitos:
    void clearStatusDirty() { _statusDirty = false; }
    void clearResultDirty() { _resultDirty = false; }

    const StepResult& getManualResult() const { return _manualResult; }
    int getLastManualStepIndex() const { return _lastManualStep; }
    bool manualResultDirty() const { return _manualResultDirty; }
    void clearManualResultDirty() { _manualResultDirty = false; }

    StepResult getLastStepResult() const;
    bool hasLastStepResult() const { return !_results.empty(); }

    StepResult getLastManualStepResult() const { return _manualResult; }
    bool hasManualStepResult() const { return _manualResultValid; }

    bool loadRecipe(const Recipe& r);
    void start();
    void tick();

    // Correr un solo paso
    void runSingleStep(int stepIndex);

    inline void setState(EngineState state){ _state = state; }
    inline EngineState state() const { return _state; }
    inline const std::vector<StepResult>& results() const { return _results; }

     // ======= Shims para compatibilidad con json_utils y mqtt_client =======
    // Devuelven directamente los campos de la receta cargada
    inline const String& currentJobID() const { return _recipe.job_id; }
    inline const String& currentSerial() const { return _recipe.serial; }
    inline const String& currentFamily() const { return _recipe.family; }
    inline size_t currentStepIndex() const { return _idx; }
    inline size_t totalSteps() const { return _recipe.steps.size(); }
    // Devuelve puntero al Step actual o nullptr si no hay uno válido
    inline const Step* currentStep() const {
        return (_idx < _recipe.steps.size()) ? &_recipe.steps[_idx] : nullptr;
    }

    // Permite que mqtt_client llame _engine.abort();
    inline void abort() { _abortRequested = true; }
    inline bool abortRequested() const { return _abortRequested; }

    //Obtener error actual
    inline char* getCurrentError(){ return errorDetail; }

private:
    Primitives& _p;
    Recipe _recipe;
    std::vector<StepResult> _results;
    StepResult _manualResult;
    bool _manualResultValid = false;

    char* errorDetail;

    bool _statusDirty  = false;
    bool _resultDirty  = false;
    bool _manualResultDirty = false;

    int _lastManualStep = -1;

    size_t _idx = 0;
    size_t _pastIdx = 0;
    unsigned long _stepStart = 0;
    EngineState _state = EngineState::IDLE;
    uint32_t _monotonic = 0; 

    // Flag de abort (atendido en tick())
    volatile bool _abortRequested = false;

    // Estado de wait no-bloqueante
    bool _waitActive = false;
    unsigned long _waitEndTime = 0;

    void touchStatus() { _statusDirty = true; ++_monotonic; }
    void touchResult() { _resultDirty = true; ++_monotonic; }
    void touchManualResult() { _manualResultDirty = true; _monotonic++; }
    void processWait(int step_ms);
};
