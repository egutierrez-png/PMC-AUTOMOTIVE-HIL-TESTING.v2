#include "family_manager.h"
#include "test_engine.h"
#include "../runtime_context.h"
#include "../protocol/uart_transport.h"
#include "../protocol/can_transport.h"

// Families
#include "families/i326_vtg_defs.h"
#include "families/vgt_defs.h"

FamilyManager::FamilyManager(Primitives& p, TestEngine& engine, ITransport& can, ITransport& uart)
: _p(p), _engine(engine), _can(can), _uart(uart) {}

static void logCanProfile() {
    const auto& c = GlobalContext.getCanProfile();
    const String famName = GlobalContext.getActiveFamily();
    const bool ext = (c.tx_id > 0x7FF) || (c.rx_id > 0x7FF);

    char buf[180];
    snprintf(buf, sizeof(buf),
             "[Family:%s] CAN bitrate=%lu, TX=0x%08lX, RX=0x%08lX, %s",
             famName.c_str(),
             (unsigned long)c.bitrate,
             (unsigned long)c.tx_id,
             (unsigned long)c.rx_id,
             ext ? "EXT29" : "STD11");
    DEBUG_SERIAL.println(buf);
}

bool FamilyManager::execute(const Recipe& recipe) {
    // --------------------------------------------------
    // Resolver familia
    // --------------------------------------------------
    String family = recipe.family;
    if (!family.length()) {
        family = "I326";   // default de banco
    }
    
    DEBUG_SERIAL.print("Family recibida: ");
    DEBUG_SERIAL.println(family);

    DEBUG_SERIAL.print("GlobalContext family: ");
    DEBUG_SERIAL.println(GlobalContext.getActiveFamily());

    const auto& c = GlobalContext.getCanProfile();
    DEBUG_SERIAL.print("CAN bitrate: ");
    DEBUG_SERIAL.println(c.bitrate);

    DEBUG_SERIAL.print("TX ID: 0x");
    DEBUG_SERIAL.println(c.tx_id, HEX);

    DEBUG_SERIAL.print("RX ID: 0x");
    DEBUG_SERIAL.println(c.rx_id, HEX);

    DEBUG_SERIAL.print("Extended: ");
    DEBUG_SERIAL.println(c.extended ? "true" : "false");

    GlobalContext.setActiveFamily(family);

    // --------------------------------------------------
    // Configuración por familia
    // --------------------------------------------------
    if (family.equalsIgnoreCase("I326")) {
        GlobalContext.setProtocol(ProtocolType::CAN);
        GlobalContext.setCanProfile(
            I326_VTG::CAN_DEFAULT_BAUDRATE,
            I326_VTG::CMD_ID,
            I326_VTG::STATUS_ID,
            true,
            I326_VTG_Config::DEFAULT_TIMEOUT_MS
        );
    }
    else if (family.equalsIgnoreCase("VGT")) {
        GlobalContext.setProtocol(ProtocolType::CAN);
        GlobalContext.setCanProfile(
            VGT_CAN::CAN_DEFAULT_BAUDRATE,
            VGT_CAN::COMMAND_ID,
            VGT_CAN::STATUS_ID,
            false, // STD11
            VGT_Config::DEFAULT_TIMEOUT_MS
        );
    }
    else {
        // Fallback seguro
        DEBUG_SERIAL.print(F("⚠️ Family no reconocida: "));
        DEBUG_SERIAL.println(family);
        DEBUG_SERIAL.println(F("Usando perfil fallback I326"));

        GlobalContext.setProtocol(ProtocolType::CAN);
        GlobalContext.setCanProfile(
            I326_VTG::CAN_DEFAULT_BAUDRATE,
            I326_VTG::CMD_ID,
            I326_VTG::STATUS_ID,
            true,
            I326_VTG_Config::DEFAULT_TIMEOUT_MS
        );
    }

    // --------------------------------------------------
    // Inicializar transporte
    // --------------------------------------------------
    if (GlobalContext.isCAN()) {
        _p.setTransport(_can);

        if (!_can.begin(GlobalContext.getCanBaudrate())) {
            DEBUG_SERIAL.println(F("❌ Error iniciando transporte CAN"));
            return false;
        }

        logCanProfile();
    } else {
        _p.setTransport(_uart);

        if (!_uart.begin(GlobalContext.getUartBaudrate())) {
            DEBUG_SERIAL.println(F("❌ Error iniciando transporte UART"));
            return false;
        }
    }

    // --------------------------------------------------
    // Cargar y arrancar receta
    // --------------------------------------------------
    _engine.loadRecipe(recipe);
    _engine.start();

    return true;
}

FamilyType FamilyManager::getActive() {
    // Temporal mientras el enum no tenga todas las familias reales
    const String family = GlobalContext.getActiveFamily();

    if (family.equalsIgnoreCase("VGT")) {
        return FamilyType::V114;
    }

    if (family.equalsIgnoreCase("I326")) {
        return FamilyType::V114;
    }

    return FamilyType::V114;
}