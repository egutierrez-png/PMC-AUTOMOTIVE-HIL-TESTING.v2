#include "StorageManager.h"

#include <ArduinoJson.h>
#include <vector>
#include "../config.h"

// Del tutorial de Arduino Pro (instalado vía Arduino_Pro_Tutorials)
#include "FlashIAPLimits.h"

// Mbed OS
#include "FlashIAPBlockDevice.h"
#include "TDBStore.h"

// Compresión de datos
#include "lz4.h"

using namespace mbed;

// --- Configuración interna ---
// Ajusta si tus JSON son muy grandes
static constexpr size_t MAX_JSON_SIZE = 32768;


// Punteros estáticos al BlockDevice y al K/V store
static FlashIAPBlockDevice* bd = nullptr;
static TDBStore*            kv = nullptr;
static bool initialized = false;

// Inicializa BlockDevice + TDBStore usando los límites calculados
static bool ensureInit() {
    if (initialized) return true;

    FlashIAPLimits limits = getFlashIAPLimits();   // viene del tutorial

    // DEBUG: imprimir info de FLASH
    {
        FlashIAP flash;
        flash.init();
        int sector_size = flash.get_sector_size(limits.start_address);
        flash.deinit();

        DEBUG_SERIAL.println(F("========== FLASH IAP INFO =========="));
        DEBUG_SERIAL.print(F("Firmware end address : 0x"));
        DEBUG_SERIAL.println(FLASHIAP_APP_ROM_END_ADDR, HEX);

        DEBUG_SERIAL.print(F("Flash start address  : 0x"));
        DEBUG_SERIAL.println(limits.start_address, HEX);

        DEBUG_SERIAL.print(F("Flash total size     : "));
        DEBUG_SERIAL.print(limits.flash_size / 1024);
        DEBUG_SERIAL.println(F(" KB"));

        DEBUG_SERIAL.print(F("Available for KVS    : "));
        DEBUG_SERIAL.print(limits.available_size / 1024);
        DEBUG_SERIAL.println(F(" KB"));

        DEBUG_SERIAL.print(F("Sector size          : "));
        DEBUG_SERIAL.print(sector_size / 1024);
        DEBUG_SERIAL.println(F(" KB"));

        DEBUG_SERIAL.print(F("TDBStore usable size : "));
        DEBUG_SERIAL.print((limits.available_size / (sector_size * 2)) * (sector_size * 2) / 1024);
        DEBUG_SERIAL.println(F(" KB"));

        DEBUG_SERIAL.println(F("===================================="));
    }

    // Crear BlockDevice para TDBStore
    bd = new FlashIAPBlockDevice(limits.start_address, limits.available_size);

    int err = bd->init();
    if (err) {
        Serial.println(F("[Storage] Error init BlockDevice"));
        return false;
    }

    kv = new TDBStore(bd);
    err = kv->init();
    if (err) {
        DEBUG_SERIAL.print(F("[Storage] Error init TDBStore, err="));
        DEBUG_SERIAL.println(err);
        return false;
    }

    initialized = true;
    DEBUG_SERIAL.println(F("[Storage] TDBStore inicializado OK"));
    return true;
}


// --- CRC32 (polinomio estándar 0xEDB88320) ---
static uint32_t crc32(const uint8_t *data, size_t len) {
    uint32_t crc = 0xFFFFFFFF;

    while (len--) {
        crc ^= *data++;
        for (int i = 0; i < 8; i++)
            crc = (crc >> 1) ^ (0xEDB88320 & -(crc & 1));
    }

    return ~crc;
}

namespace StorageManager {

bool init() {
    return ensureInit();
}

static bool isValidJson(const String& json) {
    if (!json.length()) return false;
    DynamicJsonDocument doc(MAX_JSON_SIZE);
    return !deserializeJson(doc, json);
}

bool saveLastProfile(const String& json) {
    if (!ensureInit()) return false;

    // Validar JSON con DynamicJsonDocument, no Static ni 2 KB
    if (!isValidJson(json)) {
        DEBUG_SERIAL.println(F("[Storage] Perfil inválido, no se guarda"));
        return false;
    }

    // --- Buffer dinámico grande ---
    std::vector<uint8_t> compressed(MAX_JSON_SIZE);

    // --- LZ4 Compress ---
    int compSize = LZ4_compress_default(
        json.c_str(),
        (char*)compressed.data(),
        json.length(),
        compressed.size()
    );

    if (compSize <= 0) {
        DEBUG_SERIAL.println(F("[Storage] Error LZ4 comprimiendo perfil"));
        return false;
    }

    DEBUG_SERIAL.print("compSize profile = ");
    DEBUG_SERIAL.println(compSize);

    // --- CRC sobre datos comprimidos ---
    uint32_t crc = crc32(compressed.data(), compSize);

    // --- Guardar datos comprimidos ---
    int err = kv->set("last_profile_data", compressed.data(), compSize, 0);
    if (err) {
        DEBUG_SERIAL.print(F("[Storage] Error al guardar last_profile_data, err="));
        DEBUG_SERIAL.println(err);
        return false;
    }

    // Guardar CRC
    err = kv->set("last_profile_crc", &crc, sizeof(crc), 0);
    if (err) {
        DEBUG_SERIAL.print(F("[Storage] Error al guardar last_profile_crc, err="));
        DEBUG_SERIAL.println(err);
        return false;
    }

    DEBUG_SERIAL.println(F("[Storage] last_profile + CRC guardado correctamente"));
    return true;
}



bool saveLastRecipe(const String& json) {
    if (!ensureInit()) return false;
    if (!isValidJson(json)) {
        DEBUG_SERIAL.println(F("[Storage] Receta inválida, no se guarda"));
        return false;
    }

    // Buffers dinámicos
    std::vector<uint8_t> compressed(MAX_JSON_SIZE);

    int compSize = LZ4_compress_default(
        json.c_str(),
        (char*)compressed.data(),
        json.length(),
        compressed.size()
    );

    if (compSize <= 0) {
        DEBUG_SERIAL.println(F("[Storage] Error LZ4 comprimiendo receta"));
        return false;
    }

    DEBUG_SERIAL.print("compSize recipe = ");
    DEBUG_SERIAL.println(compSize);

    uint32_t crc = crc32(compressed.data(), compSize);

    // Guardar comprimido
    int err = kv->set("last_recipe_data", compressed.data(), compSize, 0);
    if (err) return false;

    err = kv->set("last_recipe_crc", &crc, sizeof(crc), 0);
    if (err) return false;

    DEBUG_SERIAL.println(F("[Storage] last_recipe + CRC guardado correctamente"));
    return true;
}

String loadLastProfile() {
    if (!ensureInit()) return "";

    // --- Buffer compress dinámico ---
    std::vector<uint8_t> compressed(MAX_JSON_SIZE);
    size_t compSize = 0;

    int err = kv->get(
        "last_profile_data",
        compressed.data(),
        compressed.size(),
        &compSize,
        0
    );

    if (err || compSize == 0) {
        Serial.println(F("[Storage] No hay perfil guardado"));
        return "";
    }

    DEBUG_SERIAL.print("compSize loaded profile = ");
    DEBUG_SERIAL.println(compSize);

    // --- Leer CRC ---
    uint32_t storedCrc = 0;
    size_t crcSize = 0;
    kv->get("last_profile_crc", &storedCrc, sizeof(storedCrc), &crcSize, 0);

    // --- Verificar CRC ---
    uint32_t calcCrc = crc32(compressed.data(), compSize);

    if (calcCrc != storedCrc) {
        Serial.println(F("⚠️ [Storage] Perfil corrupto (CRC mismatch)"));
        return "";
    }

    // --- Descomprimir ---
    std::vector<char> jsonBuf(MAX_JSON_SIZE);

    int decSize = LZ4_decompress_safe(
        (char*)compressed.data(),
        jsonBuf.data(),
        compSize,
        jsonBuf.size()
    );

    if (decSize <= 0) {
        Serial.println(F("⚠️ [Storage] Error descomprimiendo perfil"));
        return "";
    }

    jsonBuf[decSize] = '\0';
    String json(jsonBuf.data());

    // Validar JSON
    if (!isValidJson(json)) {
        Serial.println(F("⚠️ [Storage] JSON perfil inválido"));
        return "";
    }

    Serial.println(F("[Storage] Perfil válido (LZ4 + CRC OK)"));
    return json;
}


String loadLastRecipe() {
    if (!ensureInit()) return "";

    std::vector<uint8_t> compressed(MAX_JSON_SIZE);
    size_t compSize = 0;

    int err = kv->get("last_recipe_data", compressed.data(), compressed.size(), &compSize, 0);
    if (err || compSize == 0) return "";

    uint32_t storedCrc = 0;
    size_t crcSize = 0;
    kv->get("last_recipe_crc", &storedCrc, sizeof(storedCrc), &crcSize, 0);

    if (crc32(compressed.data(), compSize) != storedCrc) return "";

    std::vector<char> jsonBuf(MAX_JSON_SIZE);

    int decSize = LZ4_decompress_safe(
        (char*)compressed.data(),
        jsonBuf.data(),
        compSize,
        jsonBuf.size()
    );

    if (decSize <= 0) return "";

    jsonBuf[decSize] = '\0';
    String json(jsonBuf.data());

    return json;
}

bool factoryResetHard() {
    if (!ensureInit()) return false;

    DEBUG_SERIAL.println(F("[Storage] Ejecutando HARD FACTORY RESET..."));

    // Reset total del KeyValueStore (TDBStore)
    int err = kv->reset();

    if (err != MBED_SUCCESS) {
        DEBUG_SERIAL.print(F("[Storage] ERROR en TDBStore::reset(): err="));
        DEBUG_SERIAL.println(err);
        return false;
    }

    DEBUG_SERIAL.println(F("[Storage] TDBStore reset completo (OK)"));

    // Desinicializar para forzar que se vuelva a inicializar
    initialized = false;

    return true;
}

} // namespace StorageManager
