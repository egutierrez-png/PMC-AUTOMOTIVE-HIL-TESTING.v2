#include "checksum_utils.h"

static inline uint8_t  rf8 (uint8_t v){ v=(v&0xF0)>>4 | (v&0x0F)<<4; v=(v&0xCC)>>2 | (v&0x33)<<2; v=(v&0xAA)>>1 | (v&0x55)<<1; return v; }
static inline uint16_t rf16(uint16_t v){ v=(v>>8)|((v&0xFF)<<8); v=(v&0xF0F0)>>4|((v&0x0F0F)<<4); v=(v&0xCCCC)>>2|((v&0x3333)<<2); v=(v&0xAAAA)>>1|((v&0x5555)<<1); return v; }
static inline uint32_t rf32(uint32_t v){
  v=(v>>16)|(v<<16);
  v=((v&0xFF00FF00UL)>>8)|((v&0x00FF00FFUL)<<8);
  v=((v&0xF0F0F0F0UL)>>4)|((v&0x0F0F0F0FUL)<<4);
  v=((v&0xCCCCCCCCUL)>>2)|((v&0x33333333UL)<<2);
  v=((v&0xAAAAAAAAUL)>>1)|((v&0x55555555UL)<<1);
  return v;
}

static uint32_t crc8(const uint8_t* d, size_t n, uint8_t poly, uint8_t init, uint8_t xorout, bool refin, bool refout){
  uint8_t c=init;
  while(n--){
    uint8_t b=*d++; if(refin) b=rf8(b);
    c^=b;
    for(int i=0;i<8;i++) c = (c&0x80) ? (uint8_t)((c<<1)^poly) : (uint8_t)(c<<1);
  }
  if(refout) c=rf8(c);
  return (c ^ xorout) & 0xFF;
}

static uint32_t crc16_ccitt(const uint8_t* d, size_t n, uint16_t poly, uint16_t init, uint16_t xorout, bool refin, bool refout){
  uint16_t c=init;
  while(n--){
    uint8_t b=*d++; if(refin) b=rf8(b);
    c ^= (uint16_t)b << 8;
    for(int i=0;i<8;i++) c = (c&0x8000) ? (uint16_t)((c<<1)^poly) : (uint16_t)(c<<1);
  }
  if(refout) c=rf16(c);
  return (c ^ xorout) & 0xFFFF;
}

static uint32_t crc16_modbus(const uint8_t* d, size_t n){
  uint16_t c=0xFFFF;
  while(n--){
    c ^= *d++;
    for(int i=0;i<8;i++) c = (c&1) ? (uint16_t)((c>>1)^0xA001) : (uint16_t)(c>>1);
  }
  return c; // LSB-first on the wire (controla con msb_first en write)
}

static uint32_t crc32_hdlc(const uint8_t* d, size_t n, uint32_t poly, uint32_t init, uint32_t xorout, bool refin, bool refout){
  uint32_t c=init;
  while(n--){
    uint8_t b=*d++; if(refin) b=rf8(b);
    c^=(uint32_t)b<<24;
    for(int i=0;i<8;i++) c = (c&0x80000000UL)? ((c<<1)^poly) : (c<<1);
  }
  if(refout) c=rf32(c);
  return c ^ xorout;
}

uint32_t compute_checksum(const uint8_t* data, size_t len, const ChecksumSpec& s){
  switch (s.type){
    case ChecksumType::SUM8: {
      uint32_t sum=0; for(size_t i=0;i<len;i++) sum+=data[i]; return sum & 0xFF;
    }
    case ChecksumType::XOR8: {
      uint8_t x=0; for(size_t i=0;i<len;i++) x^=data[i]; return x;
    }
    case ChecksumType::CRC8: {
      uint8_t poly   = (uint8_t)(s.poly   ? s.poly   : 0x07);
      uint8_t init   = (uint8_t)(s.init   & 0xFF);
      uint8_t xorout = (uint8_t)(s.xorout & 0xFF);
      return crc8(data, len, poly, init, xorout, s.refin, s.refout);
    }
    case ChecksumType::CRC16_CCITT: {
      uint16_t poly   = (uint16_t)(s.poly   ? s.poly   : 0x1021);
      uint16_t init   = (uint16_t)(s.init   ? s.init   : 0xFFFF);
      uint16_t xorout = (uint16_t)(s.xorout & 0xFFFF);
      return crc16_ccitt(data, len, poly, init, xorout, s.refin, s.refout);
    }
    case ChecksumType::CRC16_MODBUS: {
      return crc16_modbus(data, len);
    }
    case ChecksumType::CRC32: {
      uint32_t poly   = s.poly   ? s.poly   : 0x04C11DB7UL;
      uint32_t init   = s.init   ? s.init   : 0xFFFFFFFFUL;
      uint32_t xorout = s.xorout ? s.xorout : 0xFFFFFFFFUL;
      bool refin = s.refin, refout = s.refout;
      if(!s.refin && !s.refout){ refin = true; refout = true; }
      return crc32_hdlc(data, len, poly, init, xorout, refin, refout);
    }
    default: return 0;
  }
}

void write_checksum_bytes(uint8_t* dst, const ChecksumSpec& s, uint32_t v){
  if (s.put_count == 1){
    dst[s.put_at[0]] = (uint8_t)(v & 0xFF); return;
  }
  if (s.put_count == 2){
    if (s.msb_first){
      dst[s.put_at[0]] = (uint8_t)((v>>8)&0xFF);
      dst[s.put_at[1]] = (uint8_t)( v     &0xFF);
    } else {
      dst[s.put_at[0]] = (uint8_t)( v     &0xFF);
      dst[s.put_at[1]] = (uint8_t)((v>>8)&0xFF);
    }
    return;
  }
  if (s.put_count == 4){
    if (s.msb_first){
      dst[s.put_at[0]] = (uint8_t)((v>>24)&0xFF);
      dst[s.put_at[1]] = (uint8_t)((v>>16)&0xFF);
      dst[s.put_at[2]] = (uint8_t)((v>> 8)&0xFF);
      dst[s.put_at[3]] = (uint8_t)( v      &0xFF);
    } else {
      dst[s.put_at[0]] = (uint8_t)( v      &0xFF);
      dst[s.put_at[1]] = (uint8_t)((v>> 8)&0xFF);
      dst[s.put_at[2]] = (uint8_t)((v>>16)&0xFF);
      dst[s.put_at[3]] = (uint8_t)((v>>24)&0xFF);
    }
  }
}
