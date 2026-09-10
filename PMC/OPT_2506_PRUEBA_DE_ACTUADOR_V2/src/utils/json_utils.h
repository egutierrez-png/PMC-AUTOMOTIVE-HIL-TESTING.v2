#pragma once
#include <ArduinoJson.h>
#include "../engine/recipe.h"
#include "../engine/test_engine.h"


namespace JsonUtils {
  bool parseRecipe(JsonDocument& doc, Recipe& out);
  void serializeResults(JsonDocument& doc, const TestEngine& engine);
}
