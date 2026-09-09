// network_manager.cpp
#include "network_manager.h"
#include "../config.h"

NetState gNet;

static void logLink(const char* tag) {
#ifdef LINK_STATUS
  EthernetLinkStatus ls = Ethernet.linkStatus();
  DEBUG_SERIAL.print(tag); DEBUG_SERIAL.print(" link=");
  DEBUG_SERIAL.println(ls == LinkON ? "ON" : (ls == LinkOFF ? "OFF" : "UNKNOWN"));
#endif
}

void pumpNetwork() {
  const unsigned long now = millis();

  // Si ya está up, sólo vigila caída de link
#ifdef LINK_STATUS
  if (gNet.up && Ethernet.linkStatus() == LinkOFF) {
    gNet.up = false;
    Serial.println(F("🔌 Link cayó → red DOWN"));
  }
#endif

  // Si está DOWN, intenta (con backoff simple)
  if (!gNet.up && (now - gNet.lastTryMs) >= gNet.retryEveryMs) {
    gNet.lastTryMs = now;

#ifdef LINK_STATUS
    if (Ethernet.linkStatus() == LinkOFF) {
      // Evita llamar begin si no hay cable → nada bloquea
      Serial.println(F("⏭️  Sin cable (link OFF), no intento Ethernet.begin()"));
      return;
    }
#endif

    Serial.println(F("🌐 Intentando levantar Ethernet (IP estática)..."));
    // IP estática (no DHCP) → mucho menos bloqueo
    // Nota: muchas libs devuelven int 1/0; si tu variante devuelve void, omite 'ok'
    int ok = Ethernet.begin((uint8_t*)MAC, IP_LOCAL, IP_DNS, IP_GATEWAY, IP_SUBNET);
    // Da una pequeña ventana para que suba
    const unsigned long t0 = millis();
    while (millis() - t0 < gNet.initTimeoutMs) {
#ifdef LINK_STATUS
      if (Ethernet.linkStatus() == LinkON) break;
#endif
      delay(10);
    }

#ifdef LINK_STATUS
    gNet.up = (Ethernet.linkStatus() == LinkON);
#else
    gNet.up = (ok == 1); // si tu lib retorna 1 en éxito
#endif

    if (gNet.up) {
      Serial.print(F("✅ Ethernet UP. IP: "));
      Serial.println(Ethernet.localIP());
    } else {
      Serial.println(F("⚠️ No se pudo levantar Ethernet (seguiré reintentando)"));
    }
  }
  Ethernet.maintain();
}
