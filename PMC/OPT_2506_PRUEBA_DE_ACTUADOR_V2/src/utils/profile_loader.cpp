#include <ArduinoJson.h>
#include "../engine/test_engine.h"
#include "../engine/family_manager.h"
#include "../runtime_context.h"
#include "../utils/json_utils.h"
#include "../utils/profile_loader.h"
#include "../runtime_context.h"

static ChecksumType parseType(const char* t) {
  if (!t) return ChecksumType::NONE;
  String s(t); s.toLowerCase();
  if (s == "sum8")          return ChecksumType::SUM8;
  if (s == "xor8")          return ChecksumType::XOR8;
  if (s == "crc8")          return ChecksumType::CRC8;
  if (s == "crc16-ccitt")   return ChecksumType::CRC16_CCITT;
  if (s == "crc16-modbus")  return ChecksumType::CRC16_MODBUS;
  if (s == "crc32")         return ChecksumType::CRC32;
  return ChecksumType::NONE;
}

static void parseChecksum(const JsonObject& c, ChecksumSpec& s) {
  s.type       = parseType(c["type"] | "none");
  s.start      = c["start"]      | 0;
  s.length     = c["length"]     | 0;
  s.put_count  = c["put_count"]  | 0;
  s.msb_first  = c["msb_first"]  | true;
  s.poly       = c["poly"]       | s.poly;
  s.init       = c["init"]       | s.init;
  s.xorout     = c["xorout"]     | s.xorout;
  s.refin      = c["refin"]      | false;
  s.refout     = c["refout"]     | false;

  // put_at
  for (uint8_t i=0; i<min<uint8_t>(4, s.put_count); ++i) {
    s.put_at[i] = c["put_at"][i] | 0;
  }
}

static uint32_t parseHex32(const char* s) {
  if (!s || !*s) return 0;
  if (s[0]=='0' && (s[1]=='x'||s[1]=='X')) return strtoul(s+2, nullptr, 16);
  return strtoul(s, nullptr, 16);
}

bool loadCanProfileFromJson(const char* json) {
  DEBUG_SERIAL.println("Cargando perfil CAN....");
  StaticJsonDocument<2048> doc;
  if (deserializeJson(doc, json)) return false;

  const char* schema = doc["schema"] | "";
  if (strncmp(schema, "pmc.can.profile/", 16)!=0) return false;

  const char* name = doc["name"] | "UNKNOWN";
  JsonObject can = doc["can"]; if (can.isNull()) return false;

  uint32_t br  = can["bitrate"] | 500000;
  const char* txs = can["tx_id"] | "0x7E0";
  const char* rxs = can["rx_id"] | "0x7E8";
  bool ext = can["extended"] | ((parseHex32(txs) > 0x7FF) || (parseHex32(rxs) > 0x7FF));
  uint16_t defTo = doc["defaults"]["timeout_ms"] | 1000;

  GlobalContext.setProtocol(ProtocolType::CAN);
  GlobalContext.setActiveFamily(name);
  GlobalContext.setCanProfile(br, parseHex32(txs), parseHex32(rxs), ext, defTo);

   ChecksumSpec s;  // por defecto NONE
  if (doc.containsKey("checksum")) {
    parseChecksum(doc["checksum"].as<JsonObject>(), s);
  }
  GlobalContext.setChecksumSpec(s);
  DEBUG_SERIAL.println("Perfil CAN cargado correctamente!");
  return true;
}

bool loadUartProfileFromJson(const char* json) {
  DEBUG_SERIAL.println("Cargando perfil UART....");
  StaticJsonDocument<1024> doc;
  if (deserializeJson(doc, json)) return false;

  const char* schema = doc["schema"] | "";
  if (strncmp(schema, "pmc.uart.profile/", 17)!=0) return false;

  const char* name = doc["name"] | "UNKNOWN";
  uint32_t baud = doc["uart"]["baudrate"] | 115200;
  GlobalContext.setProtocol(ProtocolType::UART);
  GlobalContext.setActiveFamily(name);
  GlobalContext.setUartBaudrate(baud);

  ChecksumSpec s;
  if (doc.containsKey("checksum")) {
    parseChecksum(doc["checksum"].as<JsonObject>(), s);
    GlobalContext.setChecksumSpec(s);
  }
  DEBUG_SERIAL.println("Perfil UART cargado correctamente!");
  return true;
}