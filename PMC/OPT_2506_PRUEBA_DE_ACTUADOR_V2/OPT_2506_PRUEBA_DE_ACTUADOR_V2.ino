#include <Arduino.h>
#include <Arduino_PortentaMachineControl.h>
#include "config.h"

// Core system
#include "src/runtime_context.h"

// Network handling
#include "src/network/network_manager.h"  // pumpNetwork(), gNet

// Core engine & MQTT
#include "src/mqtt/mqtt_client.h"
#include "src/engine/primitives.h"
#include "src/engine/test_engine.h"
#include "src/engine/family_manager.h"

// Modbus
#include "src/modbus/core/ModbusTCPServerCore.h"
#include "src/modbus/registers/ModbusRegisterBank.h"
#include "src/modbus/adapter/ModbusPMCAdapter.h"
#include "src/modbus/ModbusRegisterMap.h"

// Transports
#include "src/protocol/can_transport.h"
#include "src/protocol/uart_transport.h"

// Storage
#include "src/storage/StorageManager.h"



// ===========================================================
// GLOBAL (static) OBJECTS
// ===========================================================
EthernetClient net;

CANTransport  canBus;
UARTTransport uartBus(Serial1);

Primitives      primitives(uartBus);  // arranca por UART (puedes cambiar a canBus)
TestEngine      engine(primitives);
FamilyManager   familyManager(primitives, engine, canBus, uartBus);
MqttClientHandler mqtt(net, familyManager, engine, canBus);

ModbusRegisterBank     gModbusBank;
ModbusPMCAdapter       gModbusAdapter(gModbusBank, engine);
ModbusTCPServerCore    gModbusCore(502);


// ===========================================================
// SETUP
// ===========================================================
void setup() {
  DEBUG_SERIAL.begin(115200);
  delay(1000);
  DEBUG_SERIAL.println(F("🚀 PMC Firmware inicializando..."));
  DEBUG_SERIAL.println(F("====================================="));
  loadSavedInformation();
  gMqtt = &mqtt;

  // Config inicial por defecto
  GlobalContext.setProtocol(ProtocolType::UART);
  GlobalContext.setActiveFamily("NONE");

  // Inicializa ambos buses
  canBus.begin(500000);
  uartBus.begin(115200);

  // MQTT
  mqtt.begin();

  #ifdef ENABLE_MODBUS
    enableModbus();
  #endif 

  DEBUG_SERIAL.println(F("✅ Sistema inicializado correctamente"));
  DEBUG_SERIAL.println(F("====================================="));
}

// ===========================================================
// LOOP PRINCIPAL
// ===========================================================
void loop() {
  pumpNetwork();          // gestiona Ethernet sin bloquear

  if (gNet.up) {          // solo si hay link/IP levantada
    mqtt.loop();          // aquí intentará conectar y suscribirse
    #ifdef ENABLE_MODBUS
      gModbusCore.loop();
    #endif
  }

  engine.tick();
  mqtt.pumpStatus();      // publica status/results si hay cambios
}

void testSocketConnection(uint16_t port){
  DEBUG_SERIAL.println("Probando TCP crudo al broker...");
  if (net.connect(CONFIG_BROKER_IP_ADDR, port)) {
    DEBUG_SERIAL.print("✅ TCP OK: se pudo abrir socket a 192.168.1.105:");
    DEBUG_SERIAL.println(port);
  } else {
    DEBUG_SERIAL.println("❌ TCP FAIL: NO se pudo abrir socket a 192.168.1.105:1883");
  }
}

void loadSavedInformation(){
   StorageManager::init();
   // Cargar último perfil
    String lastProf = StorageManager::loadLastProfile();
    if (lastProf.length()) {
        DEBUG_SERIAL.println(F("▶️ Restaurando perfil previo..."));
        mqtt.handleProfileMessage((char*)lastProf.c_str(), lastProf.length());
    } else{
      DEBUG_SERIAL.println(F("❌ No existe perfil previo..."));
    }

    // Cargar última receta
    String lastRec = StorageManager::loadLastRecipe();
    if (lastRec.length()) {
        DEBUG_SERIAL.println(F("▶️ Restaurando última receta..."));
        // si quieres re-ejecutarla:
        mqtt.handleJobMessage((char*)lastRec.c_str(), lastRec.length());
    } else{
      DEBUG_SERIAL.println(F("❌ No existe receta previo..."));
    }
}

void enableModbus(){
  gModbusAdapter.initStaticRegisters();

    gModbusCore.begin();

    // Conectar callbacks
    gModbusCore.onReadHolding(
        [](uint16_t addr, uint16_t quantity, uint16_t* dest) {
            gModbusAdapter.onReadHolding(addr, quantity, dest);
        }
    );
    gModbusCore.onWriteHoldingSingle(
        [](uint16_t addr, uint16_t value) -> bool {
            return gModbusAdapter.onWriteHoldingSingle(addr, value);
        }
    );
    gModbusCore.onWriteHoldingMultiple(
        [](uint16_t addr, const uint16_t* values, uint16_t quantity) -> bool {
            return gModbusAdapter.onWriteHoldingMultiple(addr, values, quantity);
        }
    );
}
