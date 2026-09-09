#include "json_utils.h"

bool JsonUtils::parseRecipe(JsonDocument& doc, Recipe& out) {
    out.job_id = doc["job_id"] | "NO_ID";
    out.serial = doc["serial"] | doc["serial_number"] | "UNKNOWN";

    JsonArray seq = doc["sequence"].as<JsonArray>();
    for (JsonVariant s : seq) {
        Step step;
        String action = s["action"] | "";

        // =====================================================
        // MAPEO DE ACCIONES
        // =====================================================
        if (action == "command_position") step.action = Action::COMMAND_POSITION;
        else if (action == "motor_off")   step.action = Action::MOTOR_OFF;
        else if (action == "wait")        step.action = Action::WAIT;
        else if (action == "custom_frame") step.action = Action::CUSTOM_FRAME;   // 🔹 nuevo
        else if (action == "set_flag")     step.action = Action::SET_FLAG;       // 🔹 nuevo
        else if (action == "read_pid")     step.action = Action::READ_PID;       // 🔹 nuevo
        else if (action == "clear_codes")  step.action = Action::CLEAR_CODES;    // 🔹 nuevo
        else                               step.action = Action::UNKNOWN;

        // =====================================================
        // PARÁMETROS COMUNES (siempre presentes)
        // =====================================================
        step.position = s["parameters"]["position"] | -1;
        step.duration_ms =
            s["parameters"]["duration_ms"] |   // estándar
            s["parameters"]["duration"]    |   // común en UIs
            s["parameters"]["ms"]          |   // abreviado
            s["parameters"]["wait_ms"]     |   // nombre explícito
            s["duration_ms"]               |   // parámetro suelto
            s["duration"]                  |   // parámetro suelto
            s["ms"]                        |   // parámetro suelto
            0;
        step.timeout_ms = s["expect"]["timeout_ms"] | s["expect"]["response_time_max_ms"] | 1000;
        step.final_position_less_than = s["expect"]["final_position_less_than"] | -1;

        // =====================================================
        // CAMPOS ADICIONALES POR TIPO
        // =====================================================
        if (step.action == Action::CUSTOM_FRAME) {
            // Ejemplo: "frame_id": 419358385, "frame_data": [96,88,185,15,2,126,0,0], "expect_response": true
            step.frame_id = s["parameters"]["frame_id"] | 0;
            JsonArray arr = s["parameters"]["frame_data"].as<JsonArray>();
            int i = 0;
            for (JsonVariant v : arr) {
                if (i < 8) step.frame_data[i++] = (uint8_t)v.as<int>();
            }
            step.expect_response = s["parameters"]["expect_response"] | false;
        }

        else if (step.action == Action::SET_FLAG) {
            // Ejemplo: "pid_major": 85, "pid_minor": 0, "bit_index": 2, "bit_state": true
            step.pid_major = s["parameters"]["pid_major"] | 0;
            step.pid_minor = s["parameters"]["pid_minor"] | 0;
            step.bit_index = s["parameters"]["bit_index"] | 0;
            step.bit_state = s["parameters"]["bit_state"] | false;
        }

        else if (step.action == Action::READ_PID) {
            // Ejemplo: "pid_major": 108, "pid_minor": 0
            step.pid_major = s["parameters"]["pid_major"] | 0;
            step.pid_minor = s["parameters"]["pid_minor"] | 0;
        }

        else if (step.action == Action::CLEAR_CODES) {
            // Ejemplo: podría definirse un PID o frame de clear específico
            step.pid_major = s["parameters"]["pid_major"] | 0;
            step.pid_minor = s["parameters"]["pid_minor"] | 0;
        }

        out.steps.push_back(step);
    }

    return true;
}

// =========================================================
// SERIALIZACIÓN DE RESULTADOS (sin cambios mayores)
// =========================================================
void JsonUtils::serializeResults(JsonDocument& doc, const TestEngine& engine) {
    doc["job_id"] = engine.currentJobID();
    doc["serial_number"] = engine.currentSerial();

    JsonArray arr = doc.createNestedArray("results");
    for (auto& r : engine.results()) {
        JsonObject o = arr.createNestedObject();
        o["step"] = r.id+1;
        o["message"] = r.message;
        o["measured_position"] = r.measured_position;
        o["response_time_ms"] = r.response_time_ms;
        o["status"] = r.pass ? "PASS" : "FAIL";
    }

    doc["overall"] = "PASS";
    doc["timestamp"] = millis();
}
