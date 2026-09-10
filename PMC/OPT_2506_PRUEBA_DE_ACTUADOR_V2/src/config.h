#pragma once
#include <Ethernet.h>

// ====== NETWORK & MQTT CONFIG ======
#define MQTT_MAX_PACKET_SIZE 20480   // 20 KB

#define SCHEMA "pmc.control/1"

#define ENABLE_MODBUS 1

#define FLASH_DEBUG 1

inline uint8_t  MAC[6]      = {0xDE,0xAD,0xBE,0xEF,0xFE,0xED};
inline IPAddress IP_LOCAL     (192,168,1,50);
inline IPAddress IP_GATEWAY   (192,168,1,1);
inline IPAddress IP_SUBNET    (255,255,255,0);
inline IPAddress IP_DNS       (8,8,8,8);

#define CONFIG_BROKER_IP      "192.168.1.105"   // IP del broker MQTT (Ignition o Mosquitto)
#define CONFIG_BROKER_IP_ADDR IPAddress(192,168,1,105)
#define CONFIG_BROKER_PORT    1883
#define CONFIG_CLIENT_ID      "PMC_Station_01"
#define CONFIG_KEEPALIVE 60

#define TOPIC_JOBS_BASE       "actuator/test/jobs"
#define TOPIC_COMMANDS_BASE   "actuator/test/cmd"
#define TOPIC_STATUS_BASE     "actuator/test/status/"
#define TOPIC_RESULTS_BASE    "actuator/test/results/"
#define TOPIC_HEARTBEAT       "actuator/test/heartbeat"

#define TOPIC_RECIPE_NEW_BASE      "pmc/EOL01/recipe"
#define TOPIC_STATUS_NEW_BASE      "pmc/EOL01/status"
#define TOPIC_STATUS_MODE          "pmc/EOL01/status/mode"
#define TOPIC_RESULTS_NEW_BASE     "pmc/EOL01/results"
#define TOPIC_CONTROL_NEW_BASE     "pmc/EOL01/control"
#define TOPIC_HEARTBEAT_NEW_BASE   "pmc/EOL01/heartbeat"
#define TOPIC_PROFILE_NEW_PREFIX   "pmc/EOL01/profile/"
#define TOPIC_RAW_CAN              "pmc/EOL01/log/raw_can"

#define TOPIC_PROFILE_PREFIX_WILDCARD  "pmc/EOL01/profile/+"
#define TOPIC_PROFILE_PREFIX_FAMILY    "pmc/EOL01/profile/"  // concat family name y publicas desde Ignition
#define TOPIC_PROFILE_PREFIX_BASE    "pmc/EOL01/profile"


// ====== TRANSPORT CONFIG ======
#define USE_CAN               1      // 1 = CAN, 0 = UART
#define CAN_BAUDRATE          500000
#define UART_BAUDRATE         115200

// ====== SYSTEM PARAMETERS ======
#define HEARTBEAT_INTERVAL_MS 10000
#define WATCHDOG_TIMEOUT_MS   60000
#define MQTT_MAX_PACKET_SIZE  2048   // asegúrate de modificar PubSubClient.h
#define DEBUG_SERIAL          Serial

// ====== SIMULATION MODE ======
// 1 = valores simulados (sin hardware)
#define SIMULATION_MODE       0
