#pragma once
#include <Arduino.h>
#include "../config.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "../runtime_context.h"
#include "../engine/family_manager.h"
#include "../protocol/i_transport.h"
#include "../engine/test_engine.h"
#include <map>
#include "../config.h"

// =============================================================
// FORWARD DECLARATION (para permitir el extern ANTES de definir la clase)
// =============================================================
class MqttClientHandler;

// =============================================================
// GLOBAL EXTERN POINTER (funciona gracias al forward declaration)
// =============================================================
extern MqttClientHandler* gMqtt;

// =============================================================
// CLASE MQTT CLIENT HANDLER
// =============================================================

/**
 * MqttClientHandler
 * -----------------
 * Gestiona la conexión MQTT, suscripciones y parsing de mensajes.
 * - Canal `/job`: recibe recetas de prueba y ejecuta por FamilyManager.
 * - Canal `/cmd`: recibe comandos globales (cambiar familia, protocolo, reset...).
 * También reporta estado y resultados periódicamente.
 */
class MqttClientHandler {
public:
    MqttClientHandler(Client& netClient, FamilyManager& famManager, TestEngine& engine, ITransport& canTransport);
    std::map<String, String> _profileCache; // family -> JSON

    void begin();
    void loop();

    // Gestión interna de mensajes
    static void onMessage(char* topic, byte* payload, unsigned int length);
    void handleJobMessage(char* payload, unsigned int length);
    void handleProfileMessage(char* payload, unsigned int length);
    void handleCommandMessage(char* payload, unsigned int length);
    // publicar mensajes CAN
    void publishRawCAN(uint32_t id, const uint8_t* data, uint8_t len);

    // Envío de estado / resultados / heartbeat
    void pumpStatus();
    void sendHeartbeat();

private:
    PubSubClient _mqtt;
    FamilyManager& _familyManager;
    TestEngine& _engine;
    ITransport& _can;
    void publishSinfferStatus();
    void publishRunMode(RunMode mode);
    void initMessage();
    bool _sniffEnabled = false;

    unsigned long _lastHeartbeat = 0;
};


