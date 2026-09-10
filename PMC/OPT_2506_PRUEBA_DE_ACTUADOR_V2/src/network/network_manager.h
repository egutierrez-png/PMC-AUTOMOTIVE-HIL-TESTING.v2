// network_manager.h
#pragma once
#include <Arduino.h>
#include <Ethernet.h>

struct NetState {
  bool up = false;                 // está arriba?
  unsigned long lastTryMs = 0;     // último intento
  uint32_t retryEveryMs = 3000;    // reintento cada 3 s
  uint32_t initTimeoutMs = 1500;   // “gracia” tras begin
};

extern NetState gNet;

// Llama periódicamente desde loop()
void pumpNetwork();
