#pragma once
#include <Arduino.h>
#include <cstdarg>
#include <cstdio>

inline void debugf(Stream& s, const char* fmt, ...) {
  char buf[160];             // ajusta tamaño si necesitas mensajes más largos
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  s.print(buf);
}
