// utils/recipePublisher.ts
import { useMqttStore } from "../store/useMqttStore";
import { useProfilesStore } from "../state/useProfilesStore";
import { useLogStore } from "../state/useLogStore";
import { v4 as uid } from "uuid";
import type { RecipeDoc } from "../types/Recipe";
import { getTopics } from "../mqtt/topics";
import { useToastStore } from "../store/useToastStore";

const rt = getTopics();


// --------------------------------------------------------
// Normaliza una receta completa para enviarse al firmware
// --------------------------------------------------------
export function toFirmwareJson(recipe: RecipeDoc): RecipeDoc {
  const seq = recipe.sequence.map((s: any) => {
    const out: any = { ...s };

    if (s.action === "custom_frame") {
      const d = (s.parameters?.frame_data ?? "") as string;

      const arr = d
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
        .map(v => {
          if (/^0x/i.test(v)) return parseInt(v, 16);
          if (/^[0-9a-fA-F]{2}$/.test(v)) return parseInt(v, 16);
          return parseInt(v, 10);
        });

      out.parameters = {
        ...s.parameters,
        frame_id: (() => {
          const raw = s.parameters?.frame_id ?? "";
          if (typeof raw === "string" && /^0x/i.test(raw)) return parseInt(raw, 16);
          return Number(raw) || 0;
        })(),
        frame_data: arr.slice(0, 8),
      };
    }

    return out;
  });

  return {
    id: recipe.id || uid(),
    schema: recipe.schema,
    testID: recipe.testID,
    family: recipe.family,
    job_id: recipe.job_id,
    serial: recipe.serial,
    profile_id: recipe.profile_id,
    sequence: seq,
    limits: { max_response_time_ms: 250 },
    logging: { save_raw_messages: true, save_response_times: true },
    timestamp: new Date().toISOString(),
  };
}


// --------------------------------------------------------
// Publica PERFIL + RECETA EXACTAMENTE AL FORMATO DEL FIRMWARE
// --------------------------------------------------------
export function publishRecipeFull(recipe: RecipeDoc) {
  const client = useMqttStore.getState().client;
  const profiles = useProfilesStore.getState().profiles;
  const pushToast = useToastStore.getState().push;
  const addLog = useLogStore.getState().add;

  if (!client) {
    pushToast("❌ MQTT no está conectado", "error");
    return;
  }

  const payload = toFirmwareJson(recipe);

  // 1) Buscar perfil
  const profile = profiles.find(p => p.id === payload.profile_id);
  if (profile) {
    const topicProfile = rt.profile(profile.name ?? "default");
    client.publish(topicProfile, JSON.stringify(profile));

    addLog({
      topic: topicProfile,
      type: "info",
      message: `Perfil ${profile.name} enviado`,
      data: profile,
    });

    pushToast(`Perfil "${profile.name}" publicado`, "success");
  } else {
    pushToast("⚠️ Receta sin perfil asociado", "warn");
  }

  // 2) Publicar receta
  client.publish(rt.recipe, JSON.stringify(payload));

  addLog({
    topic: rt.recipe,
    type: "info",
    message: "Receta publicada",
    data: payload,
  });

  pushToast("Receta publicada exitosamente", "success");
}
