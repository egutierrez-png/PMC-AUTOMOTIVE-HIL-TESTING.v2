#pragma once
#include <Arduino.h>
#include "utils/checksum_utils.h"
#include "./engine/recipe.h"
#include "./engine/actuator_status.h"

/**
 * RuntimeContext
 * ----------------
 * CONTEXTO GLOBAL industrial-grade
 * - Mantiene CAN, CAN-FD y UART
 * - Compatible 100% con tu estructura actual
 */

enum class ProtocolType { CAN, UART, CANFD };
enum class RunMode {
    AUTO,
    MANUAL
};

// =========================================================
// CONFIG RUNTIME PARA CAN / CANFD
// =========================================================
struct CanRuntime {
    uint32_t bitrate = 500000;      // Nominal bitrate (CAN y CANFD)
    uint32_t fd_bitrate = 2000000;  // Data bitrate (solo CANFD)
    bool     brs = true;            // BitRate Switching (FD)
    uint32_t tx_id = 0x7E0;
    uint32_t rx_id = 0x7E8;
    bool     extended = false;
    uint16_t default_timeout_ms = 1000;
};

// =========================================================
// CONTEXTO GLOBAL RUNTIME
// =========================================================
class RuntimeContext {
public:
    RuntimeContext() = default;
    ActuatorStatus actuator; 

    // =========================================================
    // RECETAS
    // =========================================================
    void setRecipe(const Recipe& r) { _recipe = r; _hasRecipe = true; }
    const Recipe& getRecipe() const { return _recipe; }
    bool hasRecipe() const { return _hasRecipe; }

    // =========================================================
    // PERFILES
    // =========================================================
    void setProfile(const String& p) { _profile = p; _hasProfile = true; }
    const String& getProfile() const { return _profile; }
    bool hasProfile() const { return _hasProfile; }

    // =========================================================
    // MODO DE EQUIPO
    // =========================================================
    void setRunMode(RunMode m) {
        _mode = m;
    }

    RunMode getRunMode() const {
        return _mode;
    }

    const char* getRunModeString() const {
    switch (_mode) {
        case RunMode::AUTO:   return "AUTO";
        case RunMode::MANUAL: return "MANUAL";
    }
    return "UNKNOWN";
}

    bool isAuto() const {
        return _mode == RunMode::AUTO;
    }

    bool isManual() const {
        return _mode == RunMode::MANUAL;
    }

    // =========================================================
    // FAMILIA ACTIVA
    // =========================================================
    void setActiveFamily(const String& fam) { _activeFamily = fam; }
    String getActiveFamily() const { return _activeFamily; }

    bool isFamily(const String& fam) const {
        return _activeFamily.equalsIgnoreCase(fam);
    }

    // =========================================================
    // PROTOCOLO
    // =========================================================
    void setProtocol(ProtocolType p) { _protocol = p; }

    inline void setProtocol(const String& mode) {
        if (mode.equalsIgnoreCase("CANFD")) _protocol = ProtocolType::CANFD;
        else if (mode.equalsIgnoreCase("UART")) _protocol = ProtocolType::UART;
        else _protocol = ProtocolType::CAN;
    }

    ProtocolType getProtocol() const { return _protocol; }

    bool isCAN() const   { return _protocol == ProtocolType::CAN; }
    bool isUART() const  { return _protocol == ProtocolType::UART; }
    bool isCANFD() const { return _protocol == ProtocolType::CANFD; }

    // =========================================================
    // CONFIGURACIÓN CAN / CANFD
    // =========================================================
    void setCanProfile(uint32_t br, uint32_t tx, uint32_t rx, bool ext, uint16_t defToMs) {
        _can.bitrate = br;
        _can.tx_id = tx;
        _can.rx_id = rx;
        _can.extended = ext;
        _can.default_timeout_ms = defToMs;
    }

    const CanRuntime& can() const { return _can; }
    const CanRuntime& getCanProfile() const { return _can; }

    void setCanBaudrate(uint32_t br) { _can.bitrate = br; }
    uint32_t getCanBaudrate() const { return _can.bitrate; }

    void setCanFDBitrate(uint32_t br_fd) { _can.fd_bitrate = br_fd; }
    uint32_t getCanFDBitrate() const { return _can.fd_bitrate; }

    void setCanBRS(bool enable) { _can.brs = enable; }
    bool getCanBRS() const { return _can.brs; }

    // IDs activos
    void setCanIds(uint32_t tx, uint32_t rx) {
        _can.tx_id = tx;
        _can.rx_id = rx;
        _can.extended = (tx > 0x7FF) || (rx > 0x7FF);
    }

    uint32_t getCanTxId() const { return _can.tx_id; }
    uint32_t getCanRxId() const { return _can.rx_id; }
    bool isCanExtended() const { return _can.extended; }

    void setCanDefaultTimeout(uint16_t ms) { _can.default_timeout_ms = ms; }
    uint16_t getCanDefaultTimeout() const { return _can.default_timeout_ms; }

    // =========================================================
    // CONFIG UART
    // =========================================================
    void setUartPort(HardwareSerial* port) { _uartPort = port; }
    HardwareSerial* getUartPort() const { return _uartPort; }

    void setUartBaudrate(uint32_t br) { _uartBaudrate = br; }
    uint32_t getUartBaudrate() const { return _uartBaudrate; }

    // =========================================================
    // CHECKSUM
    // =========================================================
    void setChecksumSpec(const ChecksumSpec& s) { _chk = s; }
    const ChecksumSpec& checksum() const { return _chk; }

    // =========================================================
    // PRINT DEBUG (Mejorado)
    // =========================================================
    void printConfig() const {
        Serial.println(F("========= RuntimeContext ========="));

        Serial.print(F("Family: ")); 
        Serial.println(_activeFamily);

        Serial.print(F("Protocol: "));
        switch (_protocol) {
            case ProtocolType::CAN:   Serial.println("CAN");   break;
            case ProtocolType::CANFD: Serial.println("CAN-FD");break;
            case ProtocolType::UART:  Serial.println("UART");  break;
        }

        Serial.println(F("--- CAN / CANFD ---"));
        Serial.print(F("Nominal bitrate: ")); Serial.println(_can.bitrate);
        Serial.print(F("FD bitrate: "));      Serial.println(_can.fd_bitrate);
        Serial.print(F("BRS: "));             Serial.println(_can.brs ? "ON" : "OFF");

        Serial.print(F("TX ID: 0x")); Serial.println(_can.tx_id, HEX);
        Serial.print(F("RX ID: 0x")); Serial.println(_can.rx_id, HEX);
        Serial.print(F("Extended: ")); Serial.println(_can.extended ? "YES" : "NO");
        Serial.print(F("Default Timeout: ")); Serial.println(_can.default_timeout_ms);

        Serial.println(F("--- UART ---"));
        Serial.print(F("Baudrate: ")); Serial.println(_uartBaudrate);

        Serial.println(F("=================================="));
    }

private:
    // Configuración global
    String _activeFamily = "NONE";
    Recipe _recipe;
    bool _hasRecipe = false;

    String _profile;   // Guarda el JSON literal del último perfil cargado
    bool _hasProfile = false;
    ProtocolType _protocol = ProtocolType::CAN;
    RunMode _mode = RunMode::AUTO;   // auto por defecto

    // CAN / CANFD
    CanRuntime _can;

    // UART
    HardwareSerial* _uartPort = &Serial1;
    uint32_t _uartBaudrate = 115200;

    // Checksum spec
    ChecksumSpec _chk;
};

// Instancia global
extern RuntimeContext GlobalContext;
