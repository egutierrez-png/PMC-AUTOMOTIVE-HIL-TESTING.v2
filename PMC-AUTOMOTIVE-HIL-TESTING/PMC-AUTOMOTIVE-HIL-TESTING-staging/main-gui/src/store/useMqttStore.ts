import { create } from "zustand";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";
import { getTopics } from "../mqtt/topics";
import { useToastStore } from "./useToastStore";
import { useLogStore } from "../state/useLogStore";
import { parseIncomingMessage } from "../components/signals/parsers/parseMessage";

const rt = getTopics();

interface MqttState {
  client: MqttClient | null;
  connected: boolean;
  status: string;
  results: any[];
  voltage: number;
  temperature: number;
  connect: (url: string) => void;
  publish: (topic: string, msg: any) => void;
}

export const useMqttStore = create<MqttState>((set, get) => ({
  client: null,
  connected: false,
  status: "IDLE",
  results: [],
  voltage: 13.5,
  temperature: 25.0,

  connect: (url: string) => {
    const existing = get().client;
    if (existing) {
      try {
        existing.end(true); // 🔹 Cierra la conexión anterior
      } catch (e) {
        console.warn("Error closing existing MQTT client:", e);
      }
    }
    let client;
    try{
      client = mqtt.connect(url);
    } catch(e){
      console.error("MQTT url parsing error:", e);
      return;
    }

    client.on("connect", () => {
      console.log("✅ MQTT Connected");
      const log = useLogStore.getState();
      log.add({ topic: "system", type: "info", message: "✅ MQTT Connected" });
      useToastStore.getState().push("Conectado al broker", "success");
      set({ connected: true });

      // 🔹 Suscripciones centralizadas desde topics.ts
      client.subscribe(rt.status);
      client.subscribe(rt.modeStatus);
      client.subscribe(rt.results);
      client.subscribe(rt.heartbeat);

      client.publish(rt.control, JSON.stringify({ schema: "pmc.control/1", cmd: "STATUS_ONLINE" }), { qos: 1});
    });

    client.on("reconnect", () => {
      useLogStore.getState().add({
        topic: "system",
        type: "info",
        message: "🔄 Reconnecting to MQTT broker...",
      });
    });

    client.on("close", () => {
      useLogStore.getState().add({
        topic: "system",
        type: "warn",
        message: "⚠️ MQTT connection closed",
      });
      set({ connected: false });
    });

    client.on("error", (err) => {
      useLogStore.getState().add({
        topic: "system",
        type: "error",
        message: "❌ MQTT error",
        data: err?.message || err,
      });
    });

    client.on("message", (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString());
        const log = useLogStore.getState();
        parseIncomingMessage(topic, payload);
        log.add({
          topic,
          type: "debug",
          message: "MQTT message received",
          data: msg
        });
      } catch (e) {
        console.error("MQTT JSON parse error:", e);
      }
    });

    set({ client });
  },

  publish: (topic: string, msg: any) => {
    const { client } = get();
    if (client && client.connected) {
      client.publish(topic, JSON.stringify(msg), { qos: 1 });
      const log = useLogStore.getState();
      log.add({
        topic,
        type: "info",
        message: "MQTT publish",
        data: msg,
      });
    }
  },
}));
