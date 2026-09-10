#pragma once
#include <Arduino.h>

/**
 * @file frame.h
 * @brief Frame de comunicación industrial-grade con soporte CAN clásico y CAN-FD.
 *
 * - Compatible con tu API actual:
 *      - Sigue existiendo `dlc`
 *      - Sigue existiendo `length()`
 *      - Sigue existiendo `data[...]`
 * - Extendido a:
 *      - Hasta 64 bytes (CAN-FD)
 *      - Flags is_extended, is_fd, brs, esi
 *
 * Convención IMPORTANTE:
 *  - `dlc` aquí se interpreta como "número de bytes útiles" (0–64),
 *    NO como el nibble codificado de la norma CAN-FD.
 *  - Para obtener el DLC codificado (0–15) se usan los helpers estáticos.
 */

struct Frame {

    // ================================
    // Miembros principales
    // ================================
    uint32_t id = 0;          ///< ID del mensaje (11 o 29 bits)
    uint8_t  dlc = 0;         ///< Número de bytes válidos en `data` (0–64)
    uint8_t  data[64] = {0};  ///< Buffer de datos (CAN-FD hasta 64 bytes)

    // ================================
    // Flags de control CAN / CAN-FD
    // ================================
    bool is_extended = false; ///< true = ID extendido (29 bits), false = estándar (11 bits)
    bool is_fd       = false; ///< true = CAN-FD frame, false = CAN clásico
    bool brs         = false; ///< Bit Rate Switching (solo CAN-FD)
    bool esi         = false; ///< Error State Indicator (solo CAN-FD)

    // ================================
    // Constructores
    // ================================
    Frame() = default;

    Frame(uint32_t id_, const uint8_t* bytes, uint8_t len,
          bool extended = false, bool fd = false, bool use_brs = false)
    {
        set(id_, bytes, len, extended, fd, use_brs);
    }

    // ================================
    // Helpers de longitud / DLC
    // ================================

    /// Longitud máxima permitida según sea CAN clásico o CAN-FD
    inline uint8_t maxPayload() const {
        return is_fd ? (uint8_t)64 : (uint8_t)8;
    }

    /// Ajusta y normaliza un valor de longitud a lo permitido
    inline uint8_t clampLen(uint8_t len) const {
        uint8_t maxL = maxPayload();
        return (len > maxL) ? maxL : len;
    }

    /// Compatibilidad con código existente: length() == número de bytes útiles
    inline uint8_t length() const { return dlc; }

    // ================================
    // Setters robustos
    // ================================

    /// Setea todo el frame (ID + datos + flags), normalizando longitud
    inline void set(uint32_t id_,
                    const uint8_t* bytes,
                    uint8_t len,
                    bool extended = false,
                    bool fd = false,
                    bool use_brs = false)
    {
        id          = id_;
        is_extended = extended;
        is_fd       = fd;
        brs         = use_brs;

        dlc = clampLen(len);

        if (bytes && dlc > 0) {
            memcpy(data, bytes, dlc);
        }

        // Evitar basura en bytes restantes
        for (uint8_t i = dlc; i < 64; ++i) {
            data[i] = 0;
        }
    }

    /// Actualiza solo los datos (mantiene ID y flags), con normalización
    inline void setData(const uint8_t* bytes, uint8_t len) {
        dlc = clampLen(len);

        if (bytes && dlc > 0) {
            memcpy(data, bytes, dlc);
        }

        for (uint8_t i = dlc; i < 64; ++i) {
            data[i] = 0;
        }
    }

    /// Escribe un byte de forma segura, ampliando dlc si corresponde
    inline void writeByte(uint8_t index, uint8_t value) {
        if (index >= maxPayload()) return;  // fuera de rango según modo

        data[index] = value;
        if (index >= dlc) dlc = index + 1;
    }

    /// Lee un byte seguro; si está fuera de dlc, devuelve 0.
    inline uint8_t readByte(uint8_t index) const {
        if (index < dlc) return data[index];
        return 0;
    }

    // ================================
    // Limpieza / utilidad
    // ================================

    inline void clear() {
        id          = 0;
        dlc         = 0;
        is_extended = false;
        is_fd       = false;
        brs         = false;
        esi         = false;
        memset(data, 0, sizeof(data));
    }

    // ================================
    // Helpers CAN-FD DLC mapping (opcional)
    // ================================

    /**
     * @brief Convierte bytes útiles -> DLC CAN-FD (0–15).
     * 
     * Convención típica CAN-FD:
     *  0–8   → DLC = 0–8
     *  12    → DLC = 9
     *  16    → DLC = 10
     *  20    → DLC = 11
     *  24    → DLC = 12
     *  32    → DLC = 13
     *  48    → DLC = 14
     *  64    → DLC = 15
     * 
     * Si el valor de bytes no es estándar, se redondea hacia arriba
     * al siguiente tamaño permitido.
     */
    static uint8_t bytesToFdDlc(uint8_t len) {
        if (len <= 8)  return len;
        if (len <= 12) return 9;
        if (len <= 16) return 10;
        if (len <= 20) return 11;
        if (len <= 24) return 12;
        if (len <= 32) return 13;
        if (len <= 48) return 14;
        return 15; // 64 o más
    }

    /**
     * @brief Convierte DLC CAN-FD (0–15) -> bytes útiles.
     */
    static uint8_t fdDlcToBytes(uint8_t dlcCode) {
        if (dlcCode <= 8)  return dlcCode;
        switch (dlcCode) {
            case 9:  return 12;
            case 10: return 16;
            case 11: return 20;
            case 12: return 24;
            case 13: return 32;
            case 14: return 48;
            case 15: return 64;
            default: return 0;
        }
    }

    // ================================
    // Debug
    // ================================
    inline void print() const {
    #ifdef DEBUG_FRAMES
        Serial.print(F("[FRAME] "));
        Serial.print(is_fd ? F("CAN-FD ") : F("CAN "));
        Serial.print(is_extended ? F("EXT ") : F("STD "));
        if (is_fd && brs) Serial.print(F("BRS "));
        if (is_fd && esi) Serial.print(F("ESI "));

        Serial.print(F("ID=0x"));
        Serial.print(id, HEX);
        Serial.print(F(" LEN="));
        Serial.print(dlc);
        Serial.print(F(" Data="));
        for (uint8_t i = 0; i < dlc; ++i) {
            if (data[i] < 0x10) Serial.print('0');
            Serial.print(data[i], HEX);
            Serial.print(' ');
        }
        Serial.println();
    #endif
    }
};
