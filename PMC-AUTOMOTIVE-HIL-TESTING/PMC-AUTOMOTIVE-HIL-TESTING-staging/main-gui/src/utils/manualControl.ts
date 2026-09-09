import { useMqttStore } from "../store/useMqttStore";
import { useLogStore } from "../state/useLogStore";
import { useToastStore } from "../store/useToastStore";
import { getTopics } from "../mqtt/topics";

const rt = getTopics();

// 🔧 Ajusta estos tópicos según cómo expandas el firmware
const TOPIC_MODE = rt.control;
const TOPIC_MANUAL_STEP = rt.control;


export function setRemoteMode(mode: "auto" | "manual") {
  const client = useMqttStore.getState().client;
  const addLog = useLogStore.getState().add;
  const pushToast = useToastStore.getState().push;

  if (!client) {
    pushToast("MQTT no conectado (no se pudo cambiar el modo)", "error");
    return;
  }

  const payload = { 
    schema: "pmc.control/1",
    command: "set_mode",
    mode 
  };
  client.publish(TOPIC_MODE, JSON.stringify(payload));

  addLog({
    topic: TOPIC_MODE,
    type: "info",
    message: `Modo cambiado a ${mode.toUpperCase()}`,
    data: payload,
  });

  pushToast(`Modo ${mode === "auto" ? "AUTOMÁTICO" : "MANUAL"} enviado`, "success");
}

export function runManualStep(step: number) {
  const client = useMqttStore.getState().client;
  const addLog = useLogStore.getState().add;
  const pushToast = useToastStore.getState().push;

  if (!client) {
    pushToast("MQTT no conectado (no se pudo ejecutar el paso)", "error");
    return;
  }

  const payload = {
    schema: "pmc.control/1",
    command: "run_step",
    step 
  };
  client.publish(TOPIC_MANUAL_STEP, JSON.stringify(payload));

  addLog({
    topic: TOPIC_MANUAL_STEP,
    type: "info",
    message: `Ejecutar paso manual P${step}`,
    data: payload,
  });

  pushToast(`Ejecutando paso P${step} en modo manual`, "info");
}
