#pragma once
#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Compresión "LZ4-like": misma firma que LZ4, implementación simple.
// Devuelve tamaño comprimido (>0) o <=0 si falla.
int LZ4_compress_default(const char* source, char* dest, int sourceSize, int maxDestSize);

// Descompresión "LZ4-like": misma firma que LZ4, implementación simple.
// Devuelve tamaño descomprimido (>0) o <=0 si falla.
int LZ4_decompress_safe(const char* source, char* dest, int compressedSize, int maxDecompressedSize);

#ifdef __cplusplus
}
#endif
