const express = require("express");
const bodyParser = require("body-parser");
const mqtt = require("mqtt");
const { writeTag } = require("./opcua");

// ----------------------------------------------------------
// CONFIG
// ----------------------------------------------------------
const MQTT_BROKER = "mqtt://192.168.1.105:1883";
const MQTT_TOPICS = {
    results: "actuator/test/results/#",
    status: "actuator/test/status/#",
    heartbeat: "actuator/test/heartbeat",
};

const PORT = 3000;

// ----------------------------------------------------------
// EXPRESS SETUP
// ----------------------------------------------------------
const app = express();
app.use(bodyParser.json());

// ----------------------------------------------------------
// MQTT CLIENT
// ----------------------------------------------------------
const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
    console.log("MQTT connected to:", MQTT_BROKER);
    client.subscribe([
        MQTT_TOPICS.results,
        MQTT_TOPICS.status,
        MQTT_TOPICS.heartbeat
    ]);
    console.log("MQTT subscribed:", MQTT_TOPICS);
});

// ----------------------------------------------------------
// HANDLE INCOMING MQTT MESSAGES FROM PMC
// ----------------------------------------------------------
client.on("message", async (topic, payload) => {
    let msg;
    try {
        msg = JSON.parse(payload.toString());
    } catch (e) {
        console.log("Invalid JSON from PMC:", payload.toString());
        return;
    }

    // RESULTADOS
    if (topic.startsWith("actuator/test/results/")) {
        console.log("RESULT:", msg);

        await writeTag("ns=1;s=PMC/Results/LastResult", msg);
    }

    // STATUS
    else if (topic.startsWith("actuator/test/status/")) {
        console.log("STATUS:", msg);
        await writeTag("ns=1;s=PMC/Status", msg);
    }

    // HEARTBEAT
    else if (topic === MQTT_TOPICS.heartbeat) {
        console.log("HEARTBEAT:", msg);
        await writeTag("ns=1;s=PMC/Heartbeat", msg);
    }
});

// ----------------------------------------------------------
// IGNITION -> PMC : HTTP endpoint para comandos
// ----------------------------------------------------------
app.post("/api/pmc/cmd", (req, res) => {
    console.log("CMD from HMI:", req.body);

    client.publish("actuator/test/cmd", JSON.stringify(req.body));

    res.json({ ok: true, published: req.body });
});

// ----------------------------------------------------------
// START SERVER
// ----------------------------------------------------------
app.listen(PORT, () => {
    console.log("Bridge running on http://localhost:" + PORT);
});
