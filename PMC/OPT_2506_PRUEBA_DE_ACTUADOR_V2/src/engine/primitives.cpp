#include "primitives.h"
#include "../runtime_context.h"

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
    r.id = getId();
    r.pass = ok;
    r.message = msg;
    r.measured_position = pos;
    r.response_time_ms = time;
    r.timestamp_ms = millis();
    return r;
}

// ---------------------------------------------------------
// Posición
// ---------------------------------------------------------
StepResult Primitives::commandPosition(int position, int timeout_ms) {
    char message[100];
    snprintf(message,sizeof(message),
             "Ejecutando posicion de comando(position,timeout_ms): (%d,%d)",
             position, timeout_ms);
    DEBUG_SERIAL.println(message);

#if SIMULATION_MODE
    delay(200);
    return makeResult(true, "Simulated position command", position, random(100,250));
#else
    if (!_t) return makeResult(false, "No transport");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x2E;
    f.data[1] = static_cast<uint8_t>(position);
    for (int i = 2; i < 8; i++) f.data[i] = 0;

    unsigned long tStart = millis();
    if (!_t->send(f)) 
        return makeResult(false, "Failed to send position frame");

    Frame rx;
    int to = effectiveTimeout(timeout_ms);

    if (_t->receive(rx, to)) {
        return makeResult(true, "Position reached", position,
                          (int)(millis() - tStart));
    }

    return makeResult(false, "Timeout waiting for ACK", position,
                      (int)(millis() - tStart));
#endif
}

// ---------------------------------------------------------
// Leer PID
// ---------------------------------------------------------
StepResult Primitives::readPID(int pidMajor, int pidMinor, int timeout_ms) {
    char message[100];
    snprintf(message,sizeof(message),
             "Ejecutando leer PID(pidMajor,pidMinor,timeout_ms): (%d,%d,%d)",
             pidMajor,pidMinor,timeout_ms);
    DEBUG_SERIAL.println(message);

#if SIMULATION_MODE
    delay(100);
    return makeResult(true, "Simulated PID read");
#else
    if (!_t) return makeResult(false, "No transport");
    if (pidMajor == 0 && pidMinor == 0)
        return makeResult(false, "Invalid PID");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x22;
    f.data[1] = static_cast<uint8_t>(pidMajor);
    f.data[2] = static_cast<uint8_t>(pidMinor);
    for (int i = 3; i < 8; i++) f.data[i] = 0;

    unsigned long tStart = millis();
    if (!_t->send(f))
        return makeResult(false, "PID read send fail");

    Frame rx;
    int to = effectiveTimeout(timeout_ms);

    if (_t->receive(rx, to)) {
        auto r = makeResult(true, "PID read OK");
        r.response_time_ms = (int)(millis() - tStart);
        return r;
    }

    return makeResult(false, "PID read timeout", -1,
                      (int)(millis() - tStart));
#endif
}

// ---------------------------------------------------------
// Set/Clear flag
// ---------------------------------------------------------
StepResult Primitives::setFlag(int pidMajor, int pidMinor, int bit, int state) {
    char message[100];
    snprintf(message,sizeof(message),
             "Ejecutando set Bandera(pidMajor,pidMinor,bit,state): (%d,%d,%d,%d)",
             pidMajor,pidMinor,bit,state);
    DEBUG_SERIAL.println(message);

#if SIMULATION_MODE
    return makeResult(true, "Simulated flag set");
#else
    if (!_t) return makeResult(false, "No transport");
    if (bit < 0 || bit > 7)
        return makeResult(false, "Bit index out of range");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x2E;
    f.data[1] = static_cast<uint8_t>(pidMajor);
    f.data[2] = static_cast<uint8_t>(pidMinor);
    f.data[3] = state ? (uint8_t)(1U << bit) : 0x00;
    for (int i = 4; i < 8; i++) f.data[i] = 0;

    if (_t->send(f))
        return makeResult(true, "Flag set OK");

    return makeResult(false, "Flag write failed");
#endif
}

// ---------------------------------------------------------
// Motor OFF
// ---------------------------------------------------------
StepResult Primitives::motorOff(int pidMajor, int pidMinor, int finalPosLimit,
                                int timeout_ms) {
    char message[100];
    snprintf(message,sizeof(message),
             "Ejecutando apagado de motor(pidMajor,pidMinor,posFinal,timeout_ms): (%d,%d,%d,%d)",
             pidMajor,pidMinor,finalPosLimit,timeout_ms);
    DEBUG_SERIAL.println(message);

#if SIMULATION_MODE
    delay(timeout_ms > 0 ? timeout_ms / 2 : 500);
    auto r = makeResult(true, "Simulated motor off",
                        random(0, max(1, finalPosLimit)),
                        min(timeout_ms > 0 ? timeout_ms : 1000, 1450));
    r.has_failsafe = true;
    r.failsafe_ok = r.pass;
    r.failsafe_result = r.pass ? "PASS" : "FAIL";
    return r;
#else
    if (!_t) return makeResult(false, "No transport");

    Frame f;
    f.id  = effectiveTxId(0);
    f.dlc = 8;
    f.data[0] = 0x2E;
    f.data[1] = static_cast<uint8_t>(pidMajor);
    f.data[2] = static_cast<uint8_t>(pidMinor);
    f.data[3] = 0x00;
    for (int i = 4; i < 8; i++) f.data[i] = 0;

    unsigned long tStart = millis();
    _t->send(f);

    Frame rx;
    int to = effectiveTimeout(timeout_ms);

    if (_t->receive(rx, to)) {
        auto r = makeResult(true, "Motor off acknowledged", finalPosLimit,
                            (int)(millis() - tStart));
        r.has_failsafe = true;
        r.failsafe_ok = r.pass;
        r.failsafe_result = r.pass ? "PASS" : "FAIL";
        return r;
    }

    auto r = makeResult(false, "No response motor off", finalPosLimit,
                        (int)(millis() - tStart));
    r.has_failsafe = true;
    r.failsafe_ok = r.pass;
    r.failsafe_result = r.pass ? "PASS" : "FAIL";
    return r;
#endif
}

// ---------------------------------------------------------
// Esperar (solo uso opcional - aún blocking)
// ---------------------------------------------------------
StepResult Primitives::waitMs(int ms) {
    char message[100];
    snprintf(message,sizeof(message),"Ejecutando Espera(ms): (%d)",ms);
    DEBUG_SERIAL.println(message);

    // ⛔ Aún blocking — la versión no-bloqueante requiere cambios en Engine
    delay(ms);

    return makeResult(true, "Wait complete", -1, ms);
}

// ---------------------------------------------------------
// Custom frame
// ---------------------------------------------------------
StepResult Primitives::customFrame(Frame f, bool expectResp, int timeout_ms) {
    char message[100];
    snprintf(message,sizeof(message),
             "Ejecutando custom frame (frame,expectResp,timeout_ms): (%d,%d,%d)",
             f.id,expectResp,timeout_ms);
    DEBUG_SERIAL.println(message);

#if SIMULATION_MODE
    delay(100);
    auto r = makeResult(true, "Simulated custom frame");
    r.response_time_ms = 100;
    r.timestamp_ms = millis();
    return r;
#else
    if (!_t) return makeResult(false, "No transport");

    bool hasChecksum = false;
    uint32_t checksumValue = 0;

    // TX ID
    f.id  = effectiveTxId(f.id);

    // DLC bounds
    if (f.dlc > 8) f.dlc = 8;

    // Checksum
    if (GlobalContext.checksum().type != ChecksumType::NONE) {
        const auto& s = GlobalContext.checksum();

        uint8_t start  = s.start;
        uint8_t len    = s.length ? s.length 
                                  : (f.dlc > s.put_count ? 
                                     (uint8_t)((f.dlc - s.put_count) - start) : 0);

        if ((start + len) > f.dlc)
            return makeResult(false, "Checksum range out of DLC");

        for (uint8_t i=0;i<s.put_count;i++){
            if (s.put_at[i] >= f.dlc)
                return makeResult(false, "Checksum index OOB");
        }

        checksumValue = compute_checksum(&f.data[start], len, s);
        write_checksum_bytes(f.data, s, checksumValue);
        hasChecksum = true;
    }

    unsigned long tStart = millis();

    if (!_t->send(f)) {
        auto r = makeResult(false, "Custom frame send fail");
        r.response_time_ms = (int)(millis() - tStart);
        if (hasChecksum) {
            r.has_checksum = true;
            r.checksum_value = checksumValue;
            r.checksum_ok = false;
        }
        return r;
    }

    if (expectResp) {
        int to = effectiveTimeout(timeout_ms);

        Frame rx;
        uint32_t expected = GlobalContext.isCAN() ? GlobalContext.can().rx_id : 0;

        while ((millis() - tStart) < (unsigned long)to) {
            if (_t->receive(rx, to)) {
                if (!GlobalContext.isCAN() || expected == 0 || rx.id == expected) {
                    auto r = makeResult(true, "Response OK");
                    r.response_time_ms = (int)(millis() - tStart);
                    if (hasChecksum) {
                        r.has_checksum = true;
                        r.checksum_value = checksumValue;
                        r.checksum_ok = true;
                    }
                    return r;
                }
            } else {
                break;
            }
        }

        auto r = makeResult(false, "No matching response");
        r.response_time_ms = (int)(millis() - tStart);
        if (hasChecksum) {
            r.has_checksum = true;
            r.checksum_value = checksumValue;
            r.checksum_ok = false;
        }
        return r;
    }

    auto r = makeResult(true, "Frame sent, no response expected");
    r.response_time_ms = (int)(millis() - tStart);
    if (hasChecksum) {
        r.has_checksum = true;
        r.checksum_value = checksumValue;
        r.checksum_ok = true;
    }
    return r;
#endif
}
