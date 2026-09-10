#include "family_manager.h"
#include "test_engine.h"
#include "../runtime_context.h"
#include "../protocol/uart_transport.h"
#include "../protocol/can_transport.h"

FamilyManager::FamilyManager(Primitives& p, TestEngine& engine, ITransport& can, ITransport& uart)
: _p(p), _engine(engine), _can(can), _uart(uart) {}

static void logCanProfile() {
    const auto& c = GlobalContext.getCanProfile();
    const String famName = GlobalContext.getActiveFamily();
    const bool ext = (c.tx_id > 0x7FF) || (c.rx_id > 0x7FF);
    char buf[160];
    snprintf(buf, sizeof(buf),
             "[Family:%s] CAN bitrate=%lu, TX=0x%08lX, RX=0x%08lX, %s",
             famName, (unsigned long)c.bitrate,
             (unsigned long)c.tx_id, (unsigned long)c.rx_id,
             ext ? "EXT29" : "STD11");
    DEBUG_SERIAL.println(buf);
}

bool FamilyManager::execute(const Recipe& recipe) {
    // Si no viene familia, usar V114 por defecto (como ya hacías)
    if (recipe.family.length()) {
        GlobalContext.setActiveFamily(recipe.family);
    }
    if (GlobalContext.isCAN()) {
        _p.setTransport(_can);
        _can.begin(GlobalContext.can().bitrate);   // reinit seguro
        // opcional: filtros RX según GlobalContext.can().rx_id
    } else {
        _p.setTransport(_uart);
        _uart.begin(GlobalContext.getUartBaudrate());
    }

    // Cargar y arrancar la receta — el Engine es quien ejecuta los steps
    _engine.loadRecipe(recipe);
    //_engine.start();

    // Aquí todavía no sabemos PASS/FAIL (llega cuando Engine pasa a DONE)
    return true;
}


FamilyType FamilyManager::getActive() {
    // Placeholder temporal
    return FamilyType::V114;
}
