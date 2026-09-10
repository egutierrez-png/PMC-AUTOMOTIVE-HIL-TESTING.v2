#pragma once
#include <Arduino.h>
#include <stdint.h>

enum class ChecksumType : uint8_t {
  NONE = 0,
  SUM8,
  XOR8,
  CRC8,          // poly configurable
  CRC16_CCITT,   // poly=0x1021 (CCITT-FALSE)
  CRC16_MODBUS,  // refin/refout true (A001)
  CRC32          // ISO-HDLC
};

struct ChecksumSpec {
  ChecksumType type = ChecksumType::NONE;

  // Rango a calcular dentro del frame
  uint8_t start  = 0;
  uint8_t length = 0;     // 0 => deducir (dlc - put_count - start)

  // Dónde escribir el checksum en frame.data
  uint8_t put_at[4]  = {0,0,0,0}; // índices
  uint8_t put_count  = 0;         // 1, 2 o 4 bytes
  bool    msb_first  = true;      // orden al escribir multibyte

  // Parámetros CRC (opcionales)
  uint32_t poly   = 0x1021;
  uint32_t init   = 0xFFFF;
  uint32_t xorout = 0;
  bool     refin  = false;
  bool     refout = false;
};

uint32_t compute_checksum(const uint8_t* data, size_t len, const ChecksumSpec& s);
void write_checksum_bytes(uint8_t* dst, const ChecksumSpec& s, uint32_t val);
