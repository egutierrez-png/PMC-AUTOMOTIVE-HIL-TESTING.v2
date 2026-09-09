#include "lz4.h"
#include <string.h>

// Implementación MUY simple y robusta:
// - No usa "matches", sólo bloques de literales.
// - Formato: [token][literal bytes] repetido
//   token: high nibble = literalLen (0-15), low nibble sin uso.
// Esto añade 1 byte de overhead por cada <=15 bytes de datos,
// así que el tamaño comprimido es ~sourceSize * (16/15) como máximo.

// Compresión
int LZ4_compress_default(const char* source, char* dest, int sourceSize, int maxDestSize) {
    if (!source || !dest || sourceSize < 0 || maxDestSize <= 0) {
        return 0;
    }

    const unsigned char* ip = (const unsigned char*)source;
    const unsigned char* const iend = ip + sourceSize;
    unsigned char* op = (unsigned char*)dest;
    unsigned char* const oend = op + maxDestSize;

    while (ip < iend) {
        // Longitud de literal en este bloque (máx 15)
        int literalLen = (int)(iend - ip);
        if (literalLen > 15) literalLen = 15;

        // Necesitamos 1 byte de token + literalLen bytes
        if (op + 1 + literalLen > oend) {
            // No cabe en el buffer de salida
            return 0;
        }

        // token: high nibble = literalLen, low nibble = 0
        unsigned char token = (unsigned char)((literalLen & 0x0F) << 4);
        *op++ = token;

        // copiar literales
        memcpy(op, ip, literalLen);
        op += literalLen;
        ip += literalLen;
    }

    return (int)(op - (unsigned char*)dest);
}

// Descompresión
int LZ4_decompress_safe(const char* source, char* dest, int compressedSize, int maxDecompressedSize) {
    if (!source || !dest || compressedSize < 0 || maxDecompressedSize <= 0) {
        return 0;
    }

    const unsigned char* ip = (const unsigned char*)source;
    const unsigned char* const iend = ip + compressedSize;
    unsigned char* op = (unsigned char*)dest;
    unsigned char* const oend = op + maxDecompressedSize;

    while (ip < iend) {
        // Leer token
        unsigned char token = *ip++;
        int literalLen = (token >> 4) & 0x0F;

        // Verificar espacio en comprimido
        if (ip + literalLen > iend) {
            // Datos comprimidos truncados o corruptos
            return 0;
        }

        // Verificar espacio en descomprimido
        if (op + literalLen > oend) {
            // No cabe en el buffer de salida
            return 0;
        }

        // Copiar literales
        memcpy(op, ip, literalLen);
        op += literalLen;
        ip += literalLen;
    }

    // Tamaño total descomprimido
    return (int)(op - (unsigned char*)dest);
}
