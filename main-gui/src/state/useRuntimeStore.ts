import { create } from "zustand";
import { useEffect } from "react";
import { getTopics } from "../mqtt/topics";
import { useMqttStore } from "../store/useMqttStore";
import type { TestResultPayload } from "../types/TestResult";
import type { RecipeDoc } from "../types/Recipe";   // 👈 IMPORTANTE
import { useRecipesStore } from "./useRecipeStore";
import { useToastStore } from "../store/useToastStore";
import { useLogStore } from "./useLogStore";

const rt = getTopics();

let heartbeatTimer: NodeJS.Timeout | null = null;

export type RuntimeState = {
  status: any | null;
  results: any | null;
  lastStatus?: any | null;
  lastResults?: any[] | null;
  heartbeat: any | null;
  lastCANFrame?: {
      ts: number; id: number, data: number[] 
};

  

  // 🔹 NUEVO: modo de ejecución
  mode: "auto" | "manual";
  setMode: (m: "auto" | "manual") => void;

  modePending: boolean;
  setModePending: (v: boolean) => void;

  pmcOnline: boolean;
  setPmcOnline: (v: boolean) => void;
  // -------------------------
  // Receta actualmente cargada para EJECUCIÓN
  // -------------------------
  selectedRecipeId: string | null;
  setSelectedRecipeId: (id: string | null) => void;

  selectedRecipe: RecipeDoc | null;
  setSelectedRecipe: (r: RecipeDoc | null) => void;

  setStatus: (s: any) => void;
  setResults: (r: any) => void;
  setLastStatus: (s: any) => void;
  setLastResults: (r: any[]) => void;
  setHeartbeat: (h: any) => void;

  setRecipeByJobId: (jobId: string, recipes: RecipeDoc[]) => void;

  setLastCANFrame: (f: any) => void;
};

export const useRuntimeStore = create<RuntimeState>((set) => ({
  status: null,
  results: null,
  heartbeat: null,

  lastStatus: null,
  lastResults: null,

  pmcOnline: false,
  setPmcOnline: (v: boolean) => set({ pmcOnline: v }),

   // NUEVO
  mode: "auto",
  setMode: (m) => set({ mode: m }),

  modePending: false,
  setModePending: (v: boolean) => set({ modePending: v }),

  selectedRecipeId: null,
  setSelectedRecipeId: (id) => set({ selectedRecipeId: id }),

  selectedRecipe: null,
  setSelectedRecipe: (r) => set({ selectedRecipe: r }),

  setLastCANFrame: (f) => set({ lastCANFrame: f }),
  
  setStatus: (s) => set({ status: s, lastStatus: s }),
  setResults: (r) => set({ results: r, lastResults: r }),
  setLastStatus: (s) => set({ lastStatus: s }),
  setLastResults: (r) => set({ lastResults: r }),
  setHeartbeat: (h) => set({ heartbeat: h }),

  setRecipeByJobId: (jobId, recipes) => {
    const r = recipes.find(x => x.id === jobId || x.job_id === jobId) || null;
    set({
      selectedRecipeId: r?.id || null,
      selectedRecipe: r
    });
  },
}));

// Inicializa subscripciones MQTT
export function useRuntimeMqtt() {
  const mqtt = useMqttStore(s => s.client);
  const pushToast = useToastStore((s) => s.push);
  const { setStatus, setResults, setHeartbeat } = useRuntimeStore();

  useEffect(() => {
    if (!mqtt) return;

    // Suscripciones SOLO una vez
    // mqtt.subscribe(rt.status);
    // mqtt.subscribe(rt.results);
    // mqtt.subscribe(rt.heartbeat);

    // Handler único
    const handler = (topic: string, payload: Buffer) => {
      try {
        const json = JSON.parse(payload.toString());

         // -----------------------------
        // STATUS (incluye mensaje inicial del PMC)
        // -----------------------------
        if (topic === rt.status) {
          setStatus(json);

          // 🔥 Detectamos mensaje inicial del PMC
          if (json?.schema === "eol.init.v1") {
            useRuntimeStore.getState().setPmcOnline(true);
            pushToast("Conexión establecida con "+json?.device, "info");
            useLogStore.getState().add({
                    topic: "system",
                    type: "info",
                    message: "✅ Dispotivo "+json?.device+" conectado!",
              });
            // 🔥 AUTOSINCRONIZAR MODO DESDE PMC AL ARRANCAR
            if (json?.mode.toLowerCase() === "auto" || json?.mode.toLowerCase() === "manual") {
                useRuntimeStore.getState().setMode(json.mode.toLowerCase());
                useRuntimeStore.getState().setModePending(false);
            }
            // 🔥 AUTOSINCRONIZAR RECETA DESDE PMC AL ARRANCAR
            const jobId = json?.current_recipe?.job_id || null;

            if (jobId) {
              const recipes = useRecipesStore.getState().recipes;
              useRuntimeStore.getState().setRecipeByJobId(jobId, recipes);
            }

          }

          return;
        }
         // -----------------------------
        // RESULTS
        // -----------------------------
        else if (topic === rt.results){
          setResults(json);
           // 💾 Guardar en SQLite vía IPC
          if (window?.resultsApi) {
            // Cast por claridad de tipo
            const payloadTyped = json as TestResultPayload;
            window.resultsApi.saveResult(payloadTyped).catch((err) => {
              console.warn("Failed to save result in SQLite", err);
            });
          }
          return;
        } 
         // -----------------------------
        // HEARTBEAT
        // -----------------------------
        if (topic === rt.heartbeat) {
          setHeartbeat(json);
          useRuntimeStore.getState().setPmcOnline(true);

          // Restart offline timer
          if (heartbeatTimer) clearTimeout(heartbeatTimer);
          heartbeatTimer = setTimeout(() => {
            useRuntimeStore.getState().setPmcOnline(false);
            pushToast("El dispositivo "+json?.device+" se ha desconectado!", "error");
            useLogStore.getState().add({
              topic: "system",
              type: "warn",
              message: "⚠️ Dispotivo "+json?.device+" desconectado por falta de heartbeat",
            });
          }, 20000);  // ⏱ 4 segundos sin heartbeat = offline
          return;
        }
       // -----------------------------
      // MODE STATUS
      // -----------------------------
      if (topic === rt.modeStatus) {
        const mode = json.mode === "manual" ? "manual" : "auto";
        useRuntimeStore.getState().setMode(mode);
        useRuntimeStore.getState().setModePending(false);
        return;
      }
    } catch {
      console.warn("Invalid JSON", topic);
    }
  };

    mqtt.on("message", handler);

    // ====== CLEANUP CRÍTICO ======
    return () => {
      mqtt.off("message", handler);
    };
  }, [mqtt]);  // SOLO se ejecuta cuando mqtt cambia
}
