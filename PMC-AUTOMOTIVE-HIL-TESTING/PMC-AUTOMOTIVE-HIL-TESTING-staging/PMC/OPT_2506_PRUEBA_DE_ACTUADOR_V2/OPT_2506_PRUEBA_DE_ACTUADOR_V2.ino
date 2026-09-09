#include <Arduino.h>
#include <Arduino_PortentaMachineControl.h>
#include "config.h"

// Core system
#include "src/runtime_context.h"

// Network handling
#include "src/network/network_manager.h"

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
// CHROMA APG
// ===========================================================

const float VMAX_CHROMA = 100.0;
const float IMAX_CHROMA = 25.0;
const float VREF_APG = 10.0;

const int CANAL_V = 0;      // AO0 -> VSET
const int CANAL_I = 3;      // AO3 -> ISET

const float VOLTAJE_FIJO = 12.0;
const float CORRIENTE_LIMITE = 5.0;

float voltsParaChroma(float valorDeseado, float valorMax)
{
    return (valorDeseado / valorMax) * VREF_APG;
}

void iniciarChroma()
{
    MachineControl_AnalogOut.begin();

    MachineControl_AnalogOut.setPeriod(CANAL_V,4);
    MachineControl_AnalogOut.setPeriod(CANAL_I,4);

    // Arranque seguro
    MachineControl_AnalogOut.write(CANAL_V,0);
    MachineControl_AnalogOut.write(CANAL_I,0);

    delay(500);

    // Corriente fija
    float senalI = voltsParaChroma(CORRIENTE_LIMITE, IMAX_CHROMA);
    MachineControl_AnalogOut.write(CANAL_I, senalI);

    // Voltaje fijo
    float senalV = voltsParaChroma(VOLTAJE_FIJO, VMAX_CHROMA);
    MachineControl_AnalogOut.write(CANAL_V, senalV);

    DEBUG_SERIAL.println(F("====================================="));
    DEBUG_SERIAL.println(F("CHROMA APG inicializada"));
    DEBUG_SERIAL.print(F("Voltaje fijo: "));
    DEBUG_SERIAL.print(VOLTAJE_FIJO);
    DEBUG_SERIAL.println(F(" V"));

    DEBUG_SERIAL.print(F("Corriente limite: "));
    DEBUG_SERIAL.print(CORRIENTE_LIMITE);
    DEBUG_SERIAL.println(F(" A"));
    DEBUG_SERIAL.println(F("====================================="));
}

// ===========================================================
// GLOBAL OBJECTS
// ===========================================================

EthernetClient net;

CANTransport canBus;
UARTTransport uartBus(Serial1);

Primitives primitives(canBus);
TestEngine engine(primitives);
FamilyManager familyManager(primitives, engine, canBus, uartBus);
MqttClientHandler mqtt(net, familyManager, engine, canBus);

ModbusRegisterBank gModbusBank;
ModbusPMCAdapter gModbusAdapter(gModbusBank, engine);
ModbusTCPServerCore gModbusCore(502);

// ===========================================================
// FORWARD DECLARATIONS
// ===========================================================

void loadSavedInformation();
void enableModbus();
void testSocketConnection(uint16_t port);

// ===========================================================
// SETUP
// ===========================================================

void setup()
{
    DEBUG_SERIAL.begin(115200);
    delay(1000);

    DEBUG_SERIAL.println(F("PMC Firmware inicializando..."));
    DEBUG_SERIAL.println(F("====================================="));

    // Salida digital 03
    MachineControl_DigitalOutputs.begin();
    MachineControl_DigitalOutputs.write(3, HIGH);

    // Inicializar Chroma
    iniciarChroma();

    gMqtt = &mqtt;

    // Config inicial para VGT
    GlobalContext.setProtocol(ProtocolType::CAN);
    GlobalContext.setActiveFamily("VGT");
    GlobalContext.setCanProfile(
        500000,
        0x235,
        0x236,
        false,
        1000
    );

    // loadSavedInformation();

    // Inicializa buses
    if (!canBus.begin(250000))
    {
        DEBUG_SERIAL.println(F("ERROR: no se pudo iniciar CAN"));
    }
    else
    {
        DEBUG_SERIAL.println(F("CAN listo @250k"));
    }

    if (!uartBus.begin(115200))
    {
        DEBUG_SERIAL.println(F("ERROR: no se pudo iniciar UART"));
    }
    else
    {
        DEBUG_SERIAL.println(F("UART listo @115200"));
    }

    // MQTT
    mqtt.begin();

#ifdef ENABLE_MODBUS
    enableModbus();
#endif

    DEBUG_SERIAL.println(F("Sistema inicializado correctamente"));
    DEBUG_SERIAL.println(F("====================================="));
}
// ===========================================================
// LOOP
// ===========================================================
void loop() {
  pumpNetwork();

  if (gNet.up) {
    mqtt.loop();

    #ifdef ENABLE_MODBUS
      gModbusCore.loop();
    #endif
  }

  engine.tick();
  mqtt.pumpStatus();
}

// ===========================================================
// SOCKET TEST
// ===========================================================
void testSocketConnection(uint16_t port) {
  DEBUG_SERIAL.println("Probando TCP crudo al broker...");

  if (net.connect(CONFIG_BROKER_IP_ADDR, port)) {
    DEBUG_SERIAL.print("TCP OK: socket abierto a broker puerto ");
    DEBUG_SERIAL.println(port);
    net.stop();
  } else {
    DEBUG_SERIAL.print("TCP FAIL: no se pudo abrir socket al puerto ");
    DEBUG_SERIAL.println(port);
  }
}

// ===========================================================
// RESTAURAR INFORMACIÓN
// ===========================================================
void loadSavedInformation() {

  StorageManager::init();

  String lastProf = StorageManager::loadLastProfile();

  if (lastProf.length()) {
    DEBUG_SERIAL.println(F("Restaurando perfil previo..."));
    mqtt.handleProfileMessage((char*)lastProf.c_str(), lastProf.length());
  }
  else {
    DEBUG_SERIAL.println(F("No existe perfil previo"));
  }

  String lastRec = StorageManager::loadLastRecipe();

  if (lastRec.length()) {
    DEBUG_SERIAL.println(F("Restaurando última receta..."));
    mqtt.handleJobMessage((char*)lastRec.c_str(), lastRec.length());
  }
  else {
    DEBUG_SERIAL.println(F("No existe receta previa"));
  }
}

// ===========================================================
// MODBUS
// ===========================================================
void enableModbus() {

  gModbusAdapter.initStaticRegisters();

  gModbusCore.begin();

  gModbusCore.onReadHolding(
    [](uint16_t addr,
       uint16_t quantity,
       uint16_t* dest)
    {
      gModbusAdapter.onReadHolding(addr, quantity, dest);
    }
  );

  gModbusCore.onWriteHoldingSingle(
    [](uint16_t addr,
       uint16_t value) -> bool
    {
      return gModbusAdapter.onWriteHoldingSingle(addr, value);
    }
  );

  gModbusCore.onWriteHoldingMultiple(
    [](uint16_t addr,
       const uint16_t* values,
       uint16_t quantity) -> bool
    {
      return gModbusAdapter.onWriteHoldingMultiple(addr, values, quantity);
    }
  );
}