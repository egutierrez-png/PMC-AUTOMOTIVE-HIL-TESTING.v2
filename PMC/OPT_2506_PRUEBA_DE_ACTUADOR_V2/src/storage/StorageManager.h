#pragma once
#include <Arduino.h>

namespace StorageManager {

    // Llamar en setup()
    bool init();

    // Guarda JSON del último perfil recibido por MQTT
    bool saveLastProfile(const String& json);

    // Guarda JSON de la última receta/job recibida por MQTT
    bool saveLastRecipe(const String& json);

    // Devuelve JSON guardado ("" si no hay o no es válido)
    String loadLastProfile();
    String loadLastRecipe();

    // Reset a valores de fabrica
    bool factoryResetHard();
}
