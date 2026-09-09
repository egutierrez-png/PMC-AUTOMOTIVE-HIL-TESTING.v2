#include "mqtt_client.h"
#include "../protocol/frame.h"
#include "../utils/json_utils.h"
#include "../utils/profile_loader.h"
#include "../storage/StorageManager.h"
#include "../engine/recipe.h"

static MqttClientHandler* instance = nullptr;  // Referencia estática para callback MQTT
MqttClientHandler* gMqtt = nullptr;

// =============================================================
// CONSTRUCTOR
// =============================================================
MqttClientHandler::MqttClientHandler(Client& netClient,
                                     FamilyManager& famManager,
                                     TestEngine& engine,
                                     ITransport& canTransport)
: _mqtt(netClient), _familyManager(famManager), _engine(engine), _can(canTransport) {
    instance = this;
}

// =============================================================
// INICIALIZACIÓN
// =============================================================
void MqttClientHandler::begin() {
    _mqtt.setServer(CONFIG_BROKER_IP , CONFIG_BROKER_PORT);
    _mqtt.setKeepAlive(CONFIG_KEEPALIVE);
    _mqtt.setCallback(MqttClientHandler::onMessage);
    _mqtt.setBufferSize(25000, 25000);
    char msg[64];
    snprintf(msg, sizeof(msg), "📡 MQTT configurado → broker: %s:%d", CONFIG_BROKER_IP, CONFIG_BROKER_PORT);
    DEBUG_SERIAL.println(msg);
}

// =============================================================
// MENSAJE INICIAL
// =============================================================
void MqttClientHandler::initMessage() {
    DynamicJsonDocument doc(1024);

    doc["schema"]    = "eol.init.v1";
    doc["device"]    = CONFIG_CLIENT_ID;
    doc["mode"]      = GlobalContext.getRunModeString();
    doc["family"]    = GlobalContext.getActiveFamily();
    doc["protocol"]  = GlobalContext.isCAN() ? "CAN" : "UART";
    doc["timestamp"] = millis();

    // ----------------------------
    // PERFIL ACTUAL (si existe)
    // ----------------------------
    if (GlobalContext.hasProfile()) {
        JsonDocument profileDoc;
        deserializeJson(profileDoc, GlobalContext.getProfile());
        doc["current_profile"] = profileDoc;   // embed JSON
    } else {
        doc["current_profile"] = nullptr;
    }

    // ----------------------------
    // RECETA ACTUAL (si existe)
    // ----------------------------
    if (GlobalContext.hasRecipe()) {
        JsonObject r = doc.createNestedObject("current_recipe");
        r["job_id"] = GlobalContext.getRecipe().job_id;
        r["serial"] = GlobalContext.getRecipe().serial;
        r["total_steps"] = GlobalContext.getRecipe().steps.size();
    } else {
        doc["current_recipe"] = nullptr;
    }

    // Serializar
    std::vector<char> buf(4096);
    size_t n = serializeJson(doc, buf.data(),buf.size());

    // Enviar
    DEBUG_SERIAL.println("Enviando ACK a tópico: "+String(TOPIC_STATUS_NEW_BASE));
    _mqtt.publish(TOPIC_STATUS_NEW_BASE, (uint8_t*)buf.data(), n);

    DEBUG_SERIAL.println("📤 Mensaje inicial MQTT enviado:");
    DEBUG_SERIAL.println(buf.data());
}


// =============================================================
// PUBLICAR MENSAJES CAN
// =============================================================
void MqttClientHandler::publishRawCAN(uint32_t id, const uint8_t* data, uint8_t len) {
    StaticJsonDocument<128> doc;
    doc["id"] = id;
    doc["ts"] = millis();

    JsonArray arr = doc.createNestedArray("data");
    for (uint8_t i = 0; i < len; i++) arr.add(data[i]);

    char buffer[180];
    size_t n = serializeJson(doc, buffer, sizeof(buffer));

    _mqtt.publish(TOPIC_RAW_CAN, buffer, n);
}

// =============================================================
// STATUS DE SINFFER
// =============================================================
void MqttClientHandler::publishSinfferStatus() {
  StaticJsonDocument<128> doc;
  doc["sniffer_status"] = _sniffEnabled ? "on" : "off";
  doc["timestamp"] = millis();
  // agrega otros campos de estado si quieres
  char buffer[128];
  serializeJson(doc, buffer);
  _mqtt.publish(TOPIC_STATUS_NEW_BASE, buffer);
}


// =============================================================
// PUBLICACION DE MODO
// =============================================================
void MqttClientHandler::publishRunMode(RunMode mode) {
    StaticJsonDocument<100> doc;

    doc["mode"] = (mode == RunMode::AUTO) ? "auto" : "manual";
    doc["timestamp"] = millis();  // opcional

    char buffer[100];
    size_t n = serializeJson(doc, buffer);
    DEBUG_SERIAL.print("Enviando modo a topico:"+String(TOPIC_STATUS_MODE));
    _mqtt.publish(TOPIC_STATUS_MODE, buffer, n);
}

// =============================================================
// CALLBACK GENERAL DE MENSAJES
// =============================================================
void MqttClientHandler::onMessage(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    DEBUG_SERIAL.print("📩 MQTT topic: ");
    DEBUG_SERIAL.println(t);
    DEBUG_SERIAL.print("📦 Payload length: ");
    DEBUG_SERIAL.println(length);

    if (t.endsWith("/cmd") || t.endsWith("/control")) {
        if (instance) instance->handleCommandMessage((char*)payload, length);
    } 
    else if (t.endsWith("/job") || t.endsWith("/recipe")) {
        if (instance) instance->handleJobMessage((char*)payload, length);
    }
    else if (t.startsWith(TOPIC_PROFILE_PREFIX_BASE)) {
        if (instance) instance->handleProfileMessage((char*)payload, length);
    }
}

// =============================================================
// JOB MESSAGE HANDLER → Ejecuta recetas o secuencias fijas
// =============================================================
void MqttClientHandler::handleJobMessage(char* payload, unsigned int length) {
    DynamicJsonDocument doc(25 * 1024);   // 25 KB
    auto err = deserializeJson(doc, payload, length);

    if (err) {
        DEBUG_SERIAL.println(F("❌ Error al parsear JSON del job"));
        return;
    }

    // Guardar receta/job completa
    String recipeJson;
    serializeJson(doc, recipeJson);
    StorageManager::saveLastRecipe(recipeJson);

    // Solo por si llega algo del perfil a este tópico
    if (doc.containsKey("profile")) {
        // Aplica perfil inline antes de ejecutar
        JsonVariantConst profile = doc["profile"];
        if (!profile.isNull()) {
            String tmp; 
            serializeJson(profile, tmp);
            StaticJsonDocument<1024> pdoc;
            if (!deserializeJson(pdoc, tmp)) {
                const char* sch = pdoc["schema"] | "";
                if (strncmp(sch, "pmc.can.profile/", 16)==0) handleProfileMessage((char*)tmp.c_str(), tmp.length());
                else if (strncmp(sch, "pmc.uart.profile/", 17)==0) handleProfileMessage((char*)tmp.c_str(), tmp.length());
            }
        }
    }
    // Si no, se continúa con el parseo de la receta
    Recipe recipe;
    if (!JsonUtils::parseRecipe(doc, recipe)) {
        DEBUG_SERIAL.println(F("❌ Error al crear receta"));
        return;
    }
    GlobalContext.setRecipe(recipe);
    char msg[128];
    snprintf(msg, sizeof(msg),"📨 Nuevo job recibido: %s (%s)\n", recipe.job_id.c_str(), recipe.serial.c_str());
    DEBUG_SERIAL.println(msg);
    // Ejecutar a través del FamilyManager (decide si fija o dinámica)
    _familyManager.execute(recipe);
}

// =============================================================
// COMMAND MESSAGE HANDLER → Configuración y control global
// =============================================================
void MqttClientHandler::handleCommandMessage(char* payload, unsigned int length) {
    StaticJsonDocument<512> doc;
    auto err = deserializeJson(doc, payload, length);
    if (err) {
        DEBUG_SERIAL.println(F("❌ Error al parsear JSON de comando MQTT"));
        return;
    }

    String cmd = doc["command"] | doc["cmd"] | "";
    cmd.toLowerCase();
    if(doc["schema"] != SCHEMA){
        DEBUG_SERIAL.println(F("❌ Schema incorrecto o no presente"));
        return;
    }

    // =========================================================
    // Enviar mensaje inicial
    // =========================================================
    if (cmd == "status_online") {
        initMessage();
        return;
    }

    // =========================================================
    // Cambiar configuración global
    // =========================================================
    if (cmd == "set_config") {
        String fam = doc["family"] | "NONE";
        String proto = doc["protocol"] | "CAN";

        GlobalContext.setActiveFamily(fam);
        GlobalContext.setProtocol(proto.equalsIgnoreCase("UART") ? ProtocolType::UART : ProtocolType::CAN);
        GlobalContext.setCanBaudrate(doc["can_baudrate"] | 500000);
        GlobalContext.setUartBaudrate(doc["uart_baudrate"] | 115200);

        GlobalContext.printConfig();
        return;
    }

    // =========================================================
    // Cambiar configuración global
    // =========================================================
    if(cmd == "set_mode"){
        String mode = doc["mode"] | "auto";
        RunMode newMode = RunMode::AUTO;
        if(mode.equalsIgnoreCase("auto")){
            newMode = RunMode::AUTO;
        }
        else if(mode.equalsIgnoreCase("manual")){
            if(_engine.state() == EngineState::RUNNING){
                _engine.abort();
            }
            newMode = RunMode::MANUAL;
        }
        GlobalContext.setRunMode(newMode);
        publishRunMode(newMode);
        return;
    }

     // =========================================================
    // Iniciar prueba
    // =========================================================
    if (cmd == "start") {
        if (GlobalContext.getRunMode() == RunMode::MANUAL) {
            DEBUG_SERIAL.println(F("❌ Modo MANUAL Activado! Favor de cambiar de modo!"));
            return;
        }

        if (!GlobalContext.hasRecipe()) {
            DEBUG_SERIAL.println(F("❌ No hay receta cargada"));
            return;
        }

        Recipe recipe = GlobalContext.getRecipe();

        // Forzar familia desde runtime si ya está seleccionada
        if (GlobalContext.getActiveFamily().length()) {
            recipe.family = GlobalContext.getActiveFamily();
        }

        DEBUG_SERIAL.println(F("✅ Iniciando prueba por comando MQTT.."));

        if (!_familyManager.execute(recipe)) {
            DEBUG_SERIAL.println(F("❌ FamilyManager no pudo iniciar la prueba"));
            return;
        }

        return;
    }

    // =========================================================
    // Abortar prueba actual
    // =========================================================
    if (cmd == "abort") {
        DEBUG_SERIAL.println(F("⛔ Prueba abortada por comando MQTT"));
        _engine.abort();
        return;
    }

    // =========================================================
    // Ping
    // =========================================================
    if (cmd == "ping") {
        DEBUG_SERIAL.println(F("🏓 Ping recibido desde MQTT"));
        return;
    }

    // =========================================================
    // Reset del sistema
    // =========================================================
    if (cmd == "reset") {
        DEBUG_SERIAL.println(F("🔄 Reiniciando dispositivo..."));
        NVIC_SystemReset();
    }
    // =========================================================
    // Funcionalidad SNIFFER
    // =========================================================
    if (cmd == "sniffer_on") {
        uint32_t br  = doc["bitrate"] | 500000;
        bool ext     = doc["extended"] | true;
        String maskS = doc["id_mask"] | "";
        String filtS = doc["id_filter"] | "";
        _engine.abort();                    // nos aseguramos de no TXear nada

        GlobalContext.setProtocol(ProtocolType::CAN);
        GlobalContext.setCanBaudrate(br);
        // si tu CANTransport tiene “setFilter(id,mask,extended)”, aplícalo aquí:
        // canBus.setFilter(parseHex(filtS), parseHex(maskS), ext);

        _sniffEnabled = true;
        DEBUG_SERIAL.println(F("🕵️ Sniffer ON"));
        publishSinfferStatus();
        return;
    }
    if (cmd == "sniffer_off") {
        _sniffEnabled = false; 
        publishSinfferStatus();
        DEBUG_SERIAL.println(F("🛑 Sniffer OFF"));
        return; 
    }

    if (doc["cmd"] == "factory_reset_hard") {
        DEBUG_SERIAL.println(F("⚠️ Comando recibido: HARD FACTORY RESET"));

        if (StorageManager::factoryResetHard()) {
            DEBUG_SERIAL.println(F("✅ Factory reset duro completado."));
            delay(200);
            NVIC_SystemReset();
        } else {
            DEBUG_SERIAL.println(F("❌ Falló factory reset duro."));
        }
    }

    if (cmd == "run_step") {
        int step = doc["step"] | -1;
        if (GlobalContext.isAuto()) {
            DEBUG_SERIAL.println(F("❌ run_step ignorado, estamos en AUTO"));
            return;
        }
        char* msg;
        snprintf(msg, sizeof(msg),"🟡 Comando: run_step %d\n", step);
        DEBUG_SERIAL.println(msg);
        _engine.runSingleStep(step-1);
        return;
    }

    DEBUG_SERIAL.println(F("⚠️ Comando MQTT desconocido"));
}


// =============================================================
// PROFILE MESSAGE HANDLER → Configuración manejo de perfil de actuador
// =============================================================

void MqttClientHandler::handleProfileMessage(char* payload, unsigned int length) {
    String jsonStr(payload, length);
    // ⭐ GUARDAR ANTES DE APLICAR
    StorageManager::saveLastProfile(jsonStr);
    GlobalContext.setProfile(jsonStr);

    DynamicJsonDocument doc(10 * 1024);
    auto err = deserializeJson(doc, jsonStr);
    if (err) {
        DEBUG_SERIAL.println(F("❌ Error JSON perfil"));
        return;
    }

    const char* schema = doc["schema"] | "";
    const char* name   = doc["name"]   | "UNKNOWN";

    if (strncmp(schema, "pmc.can.profile/", 16) == 0) {
        loadCanProfileFromJson(jsonStr.c_str());
        DEBUG_SERIAL.println(F("✅ Perfil CAN aplicado (runtime)"));
        return;
    }

    if (strncmp(schema, "pmc.uart.profile/", 17) == 0) {
        loadUartProfileFromJson(jsonStr.c_str());
        DEBUG_SERIAL.println(F("✅ Perfil UART aplicado (runtime)"));
        return;
    }

    DEBUG_SERIAL.println(F("⚠️ Perfil desconocido (schema no coincide)"));
}

// =============================================================
// LOOP PRINCIPAL
// =============================================================
void MqttClientHandler::loop() {
    if (!_mqtt.connected()) {
        DEBUG_SERIAL.println(F("🔌 Conectando al broker..."));
        DEBUG_SERIAL.print("status de conexión: ");
        DEBUG_SERIAL.println(_mqtt.state());
        if (_mqtt.connect(CONFIG_CLIENT_ID)) {
            DEBUG_SERIAL.println(F("✅ Conectado al broker MQTT!"));
            initMessage(); 

            // Suscripciones
            _mqtt.subscribe(TOPIC_CONTROL_NEW_BASE);
            _mqtt.subscribe(TOPIC_RECIPE_NEW_BASE);
            _mqtt.subscribe(TOPIC_PROFILE_PREFIX_WILDCARD);
            char msg[256];
            snprintf(msg, sizeof(msg),"📡 Subscrito a: %s, %s, %s, %s\n", TOPIC_CONTROL_NEW_BASE , TOPIC_COMMANDS_BASE, TOPIC_RECIPE_NEW_BASE, TOPIC_PROFILE_PREFIX_WILDCARD);
            DEBUG_SERIAL.println(msg);
        }
    }

    _mqtt.loop();

    // Revision de paquetes cuando sniffer está activo
    if (_sniffEnabled) {
        Frame rx;
        // usa un timeout corto para no bloquear MQTT.loop()
        if (_can.receive(rx, 2)) {
            char topic[128];
            snprintf(topic, sizeof(topic), "actuator/sniff/raw/%s", CONFIG_CLIENT_ID);

            // json mínimo sin alocar de más
            StaticJsonDocument<160> doc;
            doc["ts"]  = millis();
            doc["id"]  = rx.id;
            doc["ext"] = (rx.id > 0x7FF);   // o GlobalContext.isCanExtended()
            doc["dlc"] = rx.dlc;

            // data → hex string
            char hex[17];  // 8 bytes *2 + '\0'
            for (uint8_t i=0; i<rx.dlc; ++i) sprintf(&hex[i*2], "%02X", rx.data[i]);
            hex[rx.dlc*2] = 0;
            doc["data"] = hex;

            char buf[192];
            size_t n = serializeJson(doc, buf);
            _mqtt.publish(topic, reinterpret_cast<const uint8_t*>(buf), n);
        }
    }
    // Heartbeat periódico
    unsigned long now = millis();
    if (now - _lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        _lastHeartbeat = now;
        sendHeartbeat();
    }
}

// =============================================================
// REPORTAR ESTADO EN CURSO Y RESULTADOS
// =============================================================
void MqttClientHandler::pumpStatus() {
    const auto snap = _engine.snapshot();

    // 1) Estado en progreso (RUNNING) — publica solo si hay cambios
    if ((snap.state == EngineState::IDLE || snap.state == EngineState::RUNNING) && _engine.statusDirty()) {
        DynamicJsonDocument msg(512);
        msg["schema"]        = "eol.status.v1";
        msg["job_id"]        = snap.job_id;
        msg["serial_number"] = snap.serial;
        msg["status"]        = snap.state == EngineState::IDLE ? "IDLE" : "RUNNING";
        msg["current_step"]  = snap.current_step;
        msg["total_steps"]   = snap.total_steps;
        msg["ts"]            = millis();
        msg["seq"]           = snap.monotonic;  // idempotencia

        char topic[128];
        snprintf(topic, sizeof(topic), "%s%s", TOPIC_STATUS_NEW_BASE, snap.serial.c_str());

        char buf[512];
        size_t n = serializeJson(msg, buf);
        _mqtt.publish(TOPIC_STATUS_NEW_BASE, reinterpret_cast<const uint8_t*>(buf), n);

        _engine.clearStatusDirty();
        DEBUG_SERIAL.print("📤 Status por MQTT al topico: "+String(TOPIC_STATUS_NEW_BASE));
        DEBUG_SERIAL.println("Con payload: "+String(buf));
    }

    // ------------------------------------------------------
    //  MANUAL STEP RESULT  (CORRECTO)
    // ------------------------------------------------------
    if (_engine.manualResultDirty()) {

        const StepResult& mr = _engine.getManualResult();
        int stepIndex = _engine.getLastManualStepIndex();  // vamos a crearlo abajo

        DynamicJsonDocument msg(512);

        msg["schema"] = "eol.manual_result.v1";
        msg["type"]   = "manual";
        msg["manual_step"] = stepIndex;

        msg["job_id"]        = GlobalContext.getRecipe().job_id;
        msg["serial_number"] = GlobalContext.getRecipe().serial;

        JsonArray arr = msg.createNestedArray("results");
        JsonObject r = arr.createNestedObject();

        r["step"]              = stepIndex;
        r["status"]            = mr.pass ? "PASS" : "FAIL";
        r["message"]           = mr.message;
        r["response_time_ms"]  = mr.response_time_ms;
        r["measured_position"] = mr.measured_position;

        // Serializar
        char buf[768];
        size_t n = serializeJson(msg, buf, sizeof(buf));
        _mqtt.publish(TOPIC_RESULTS_NEW_BASE, (uint8_t*)buf, n);

        DEBUG_SERIAL.print("📤 Resultado MANUAL enviado: ");
        DEBUG_SERIAL.println(buf);

        _engine.clearManualResultDirty();
    }

    // 2) Resultados finales — solo si hay resultados pendientes
    if (snap.state == EngineState::DONE && _engine.resultDirty()) {
        // Capacidad según tamaño de results:
        size_t cap = 512 + _engine.results().size() * 96; // ajusta si tienes más campos
        DynamicJsonDocument msg(cap);
        JsonUtils::serializeResults(msg, _engine);
        msg["schema"] = "eol.result.v1";
        msg["seq"]    = snap.monotonic;

        //char topic[128];
        //snprintf(topic, sizeof(topic), "%s/%s", TOPIC_RESULTS_NEW_BASE , snap.serial.c_str());

        std::vector<char> buf(cap);
        size_t n = serializeJson(msg, buf.data(), buf.size());
        _mqtt.publish(TOPIC_RESULTS_NEW_BASE, (uint8_t*)buf.data(), n);

        _engine.clearResultDirty();
        DEBUG_SERIAL.print("📤 Resultados AUTO enviados por MQTT al topico: "+String(TOPIC_RESULTS_NEW_BASE));
        DEBUG_SERIAL.println("Con payload: "+String(buf.data()));
        _engine.setState(EngineState::IDLE);
    }

    // 3) Estado de Error (ERROR) — publica solo si hay cambios ante evento
    if (snap.state == EngineState::ERROR && _engine.statusDirty()) {
        DynamicJsonDocument msg(512);
        msg["schema"]        = "eol.status.v1";
        msg["job_id"]        = snap.job_id;
        msg["serial_number"] = snap.serial;
        msg["status"]        = "ERROR";
        msg["error_detail"]  = _engine.getCurrentError();
        msg["current_step"]  = snap.current_step;
        msg["total_steps"]   = snap.total_steps;
        msg["ts"]            = millis();
        msg["seq"]           = snap.monotonic;  // idempotencia

        char topic[128];
        snprintf(topic, sizeof(topic), "%s%s", TOPIC_STATUS_NEW_BASE, snap.serial.c_str());

        char buf[512];
        size_t n = serializeJson(msg, buf);
        _mqtt.publish(TOPIC_STATUS_NEW_BASE, reinterpret_cast<const uint8_t*>(buf), n);

        _engine.clearStatusDirty();
    }
}

// =============================================================
// HEARTBEAT (Keep-alive cada N segundos)
// =============================================================
void MqttClientHandler::sendHeartbeat() {
    StaticJsonDocument<256> hb;
    hb["device"] = CONFIG_CLIENT_ID;
    hb["status"] = "ONLINE";
    hb["family"] = GlobalContext.getActiveFamily();
    hb["protocol"] = GlobalContext.isCAN() ? "CAN" : "UART";
    hb["timestamp"] = millis();

    char buffer[256];
    size_t n = serializeJson(hb, buffer);
    _mqtt.publish(TOPIC_HEARTBEAT_NEW_BASE, buffer);
    DEBUG_SERIAL.println(F("💓 Heartbeat enviado"));
}

