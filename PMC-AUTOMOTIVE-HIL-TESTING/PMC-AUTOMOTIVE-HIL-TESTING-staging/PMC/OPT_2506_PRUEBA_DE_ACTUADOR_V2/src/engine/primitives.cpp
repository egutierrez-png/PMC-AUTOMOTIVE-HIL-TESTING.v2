#include "primitives.h"
#include "../runtime_context.h"

// Families
#include "families/i326_vtg_defs.h"
#include "families/vgt_defs.h"

static inline int effectiveTimeout(int timeout_ms) {
  if (timeout_ms > 0) return timeout_ms;
  if (GlobalContext.isCAN()) return GlobalContext.getCanDefaultTimeout();
  return 1000;
}

static inline uint32_t effectiveTxId(uint32_t suggested) {
  if (suggested != 0) return suggested;
  if (GlobalContext.isCAN()) return GlobalContext.getCanTxId();
  return 0;
}

Primitives::Primitives(ITransport& t) : _t(&t) {}

void Primitives::setTransport(ITransport& t) {
    _t = &t;
}

StepResult Primitives::makeResult(bool ok, const String& msg, int pos, int time) {
    StepResult r;
    r.pass = ok;
    r.message = msg;
    r.measured_position = pos;
    r.response_time_ms = time;
    r.timestamp_ms = millis();
    return r;
}

// ---------------------------------------------------------
// Helper local: build command frame according to family
// ---------------------------------------------------------
static bool buildFamilyPositionCommand(Frame& f, int positionPct, bool motorOn) {
    if (positionPct < 0) positionPct = 0;
    if (positionPct > 100) positionPct = 100;

    f.dlc = 8;
    for (int i = 0; i < 8; i++) f.data[i] = 0x00;

    if (GlobalContext.isFamily("I326")) {
        f.id = I326_VTG::CMD_ID;
        I326_VTG_Helper::buildCommand(f.data, (float)positionPct, motorOn);
        return true;
    }

    if (GlobalContext.isFamily("VGT")) {
        f.id = VGT_CAN::COMMAND_ID;
        VGT_Helper::buildCommand(f.data, (float)positionPct, motorOn);
        return true;
    }

    return false;
}

static uint32_t getFamilyStatusId() {
    if (GlobalContext.isFamily("I326")) return I326_VTG::STATUS_ID;
    if (GlobalContext.isFamily("VGT"))  return VGT_CAN::STATUS_ID;
    return GlobalContext.getCanRxId();
}

static int decodeFamilyActualPosition(const Frame& rx) {
    if (rx.dlc < 2) return -1;

    if (GlobalContext.isFamily("I326")) {
        return I326_VTG_Helper::decodeActualPositionPct(rx.data);
    }

    if (GlobalContext.isFamily("VGT")) {
        return (int)VGT_Helper::decodeActualPositionPct(rx.data);
    }

    // Fallback genérico little-endian legacy
    uint16_t rawPos = (uint16_t)rx.data[0] | ((uint16_t)rx.data[1] << 8);
    return (int)(rawPos / 10);
}

// ---------------------------------------------------------
// Enviar comando de posición
// ---------------------------------------------------------
StepResult Primitives::commandPosition(int position, int timeout_ms) {
    DEBUG_SERIAL.print("isFamily(I326): ");
    DEBUG_SERIAL.println(GlobalContext.isFamily("I326") ? "YES" : "NO");

    DEBUG_SERIAL.print("isFamily(VGT): ");
    DEBUG_SERIAL.println(GlobalContext.isFamily("VGT") ? "YES" : "NO");

    DEBUG_SERIAL.print("Status esperado: 0x");
    DEBUG_SERIAL.println(getFamilyStatusId(), HEX);
    
#if SIMULATION_MODE
    delay(200);
    return makeResult(true, "Simulated position command", position, random(100, 250));
#else
    if (!_t) return makeResult(false, "No transport");

    Frame f;
    if (!buildFamilyPositionCommand(f, position, true)) {
        return makeResult(false, "Unsupported family for commandPosition");
    }

    const uint32_t STATUS_ID = getFamilyStatusId();
    const unsigned long t0 = millis();

    // Enviar varias veces para asegurar captura del comando
    for (int i = 0; i < 5; i++) {
        if (!_t->send(f)) {
            return makeResult(false, "Failed to send position command", -1,
                              (int)(millis() - t0));
        }
        delay(20);
    }

    const int to = effectiveTimeout(timeout_ms);
    const unsigned long waitStart = millis();

    Frame rx;
    int lastMeasuredPos = -1;

    while ((int)(millis() - waitStart) < to) {
        if (_t->receive(rx, 50)) {
            if (rx.id == STATUS_ID && rx.dlc >= 2) {
                lastMeasuredPos = decodeFamilyActualPosition(rx);

                if (lastMeasuredPos >= 0 && abs(lastMeasuredPos - position) <= 2) {
                    return makeResult(true, "Position reached", lastMeasuredPos,
                                      (int)(millis() - t0));
                }
            }
        }
    }

    return makeResult(false, "Position timeout", lastMeasuredPos,
                      (int)(millis() - t0));
#endif
}

// ---------------------------------------------------------
// Leer PID
// Nota: esto sigue siendo genérico/legacy.
// ---------------------------------------------------------
StepResult Primitives::readPID(int pidMajor, int pidMinor, int timeout_ms) {
#if SIMULATION_MODE
    delay(100);
    return makeResult(true, "Simulated PID read");
#else
    if (!_t) return makeResult(false, "No transport");
    if (pidMajor == 0 && pidMinor == 0) return makeResult(false, "Invalid PID");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x22;
    f.data[1] = static_cast<uint8_t>(pidMajor);
    f.data[2] = static_cast<uint8_t>(pidMinor);
    for (int i = 3; i < 8; i++) f.data[i] = 0x00;

    const unsigned long t0 = millis();
    if (!_t->send(f)) return makeResult(false, "PID read send fail");

    Frame rx;
    const int to = effectiveTimeout(timeout_ms);
    if (_t->receive(rx, to)) {
        auto r = makeResult(true, "PID read OK");
        r.response_time_ms = (int)(millis() - t0);
        return r;
    }
    return makeResult(false, "PID read timeout", -1, (int)(millis() - t0));
#endif
}

// ---------------------------------------------------------
// Set/Clear flag bit
// Nota: se conserva genérico/legacy
// ---------------------------------------------------------
StepResult Primitives::setFlag(int pidMajor, int pidMinor, int bit, int state) {
#if SIMULATION_MODE
    return makeResult(true, "Simulated flag set");
#else
    if (!_t) return makeResult(false, "No transport");
    if (bit < 0 || bit > 7) return makeResult(false, "Bit index out of range");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x2E;
    f.data[1] = static_cast<uint8_t>(pidMajor);
    f.data[2] = static_cast<uint8_t>(pidMinor);
    f.data[3] = state ? static_cast<uint8_t>(1U << bit) : 0x00;
    for (int i = 4; i < 8; i++) f.data[i] = 0x00;

    if (_t->send(f)) return makeResult(true, "Flag set OK");
    return makeResult(false, "Flag write failed");
#endif
}

// ---------------------------------------------------------
// Motor OFF (y espera retorno)
// ---------------------------------------------------------
StepResult Primitives::motorOff(int pidMajor, int pidMinor, int finalPosLimit, int timeout_ms) {
#if SIMULATION_MODE
    delay(timeout_ms > 0 ? timeout_ms / 2 : 500);
    return makeResult(true, "Simulated motor off",
                      random(0, max(1, finalPosLimit)),
                      min(timeout_ms > 0 ? timeout_ms : 1000, 1450));
#else
    if (!_t) return makeResult(false, "No transport");
    (void)pidMajor;
    (void)pidMinor;

    Frame f;
    if (!buildFamilyPositionCommand(f, 0, false)) {
        return makeResult(false, "Unsupported family for motorOff");
    }

    const uint32_t STATUS_ID = getFamilyStatusId();
    const unsigned long t0 = millis();

    for (int i = 0; i < 5; i++) {
        if (!_t->send(f)) {
            return makeResult(false, "Failed to send motor off frame", -1,
                              (int)(millis() - t0));
        }
        delay(20);
    }

    const int to = effectiveTimeout(timeout_ms);
    const unsigned long waitStart = millis();

    Frame rx;
    int lastMeasuredPos = -1;

    while ((int)(millis() - waitStart) < to) {
        if (_t->receive(rx, 50)) {
            if (rx.id == STATUS_ID && rx.dlc >= 2) {
                lastMeasuredPos = decodeFamilyActualPosition(rx);

                if (lastMeasuredPos >= 0 && lastMeasuredPos < finalPosLimit) {
                    return makeResult(true, "Motor off OK", lastMeasuredPos,
                                      (int)(millis() - t0));
                }
            }
        }
    }

    return makeResult(false, "Motor off timeout", lastMeasuredPos,
                      (int)(millis() - t0));
#endif
}

// ---------------------------------------------------------
// Esperar
// ---------------------------------------------------------
StepResult Primitives::waitMs(int ms) {
    delay(ms);
    return makeResult(true, "Wait complete", -1, ms);
}

// ---------------------------------------------------------
// Frame personalizado
// ---------------------------------------------------------
StepResult Primitives::customFrame(Frame f, bool expectResp, int timeout_ms) {
#if SIMULATION_MODE
    delay(100);
    auto r = makeResult(true, "Simulated custom frame");
    r.response_time_ms = 100;
    r.timestamp_ms = millis();
    return r;
#else
    if (!_t) return makeResult(false, "No transport");

    f.id = effectiveTxId(f.id);

    if (f.dlc > 8) f.dlc = 8;

    if (GlobalContext.checksum().type != ChecksumType::NONE) {
        const auto& s = GlobalContext.checksum();

        uint8_t start  = s.start;
        uint8_t len    = s.length ? s.length
                                  : (f.dlc > s.put_count ? (uint8_t)((f.dlc - s.put_count) - start) : 0);

        if ((start + len) > f.dlc) {
            return makeResult(false, "Checksum range out of DLC");
        }

        for (uint8_t i = 0; i < s.put_count; i++) {
            if (s.put_at[i] >= f.dlc) return makeResult(false, "Checksum index OOB");
        }

        uint32_t val = compute_checksum(&f.data[start], len, s);
        write_checksum_bytes(f.data, s, val);
    }

    const unsigned long t0 = millis();

    if (!_t->send(f)) {
        auto r = makeResult(false, "Custom frame send fail");
        r.response_time_ms = (int)(millis() - t0);
        return r;
    }

    const int to = effectiveTimeout(timeout_ms);

    if (expectResp) {
        Frame rx;
        if (_t->receive(rx, to)) {
            auto r = makeResult(true, "Response OK");
            r.response_time_ms = (int)(millis() - t0);
            return r;
        } else {
            auto r = makeResult(false, "No response");
            r.response_time_ms = (int)(millis() - t0);
            return r;
        }
    }

    auto r = makeResult(true, "Frame sent, no response expected");
    r.response_time_ms = (int)(millis() - t0);
    return r;
#endif
}