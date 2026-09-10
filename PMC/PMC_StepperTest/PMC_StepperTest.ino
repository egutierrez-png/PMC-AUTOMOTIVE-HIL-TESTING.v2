#include <Arduino_PortentaMachineControl.h>
#include <Wire.h>

#define STEP_PIN 0   // DO0
#define DIR_PIN  1   // DO1
#define NUM_STEPS 200
#define STEP_DELAY_US 1000

void setup() {
  Serial.begin(115200);
  Wire.begin();

  MachineControl_DigitalOutputs.begin();
  Serial.println("⚙️ Prueba segura: 200 pasos con DO0/DO1");

  // Dirección hacia adelante
  MachineControl_DigitalOutputs.write(DIR_PIN, HIGH);

  delay(1000);  // Espera antes de iniciar

  // Movimiento limitado
  for (int i = 0; i < NUM_STEPS; i++) {
    MachineControl_DigitalOutputs.write(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY_US);
    MachineControl_DigitalOutputs.write(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY_US);
  }

  Serial.println("✅ Movimiento finalizado.");
}

void loop() {
  // No hacer nada por seguridad
}
