import { useEffect, useState } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { Panel } from "./Panel";
import { publishRecipeFull } from "../utils/recipePublisher";
import { runManualStep } from "../utils/manualControl";


type Step = {
  step: number;
  label?: string;
  command?: string;
  status?: string;
  message?: string;

  // Nuevo: métricas
  startedAt?: number | null;  // timestamp ms
  durationMs?: number;        // acumulado
  response_time_ms?: number;  // desde results
};

export default function StepChecklist() {
  const status = useRuntimeStore((s) => s.status);
  const results = useRuntimeStore((s) => s.results);
  const selectedRecipe = useRuntimeStore((s) => s.selectedRecipe);
  const mode = useRuntimeStore((s) => s.mode);

  const [steps, setSteps] = useState<Step[]>([]);

  const initializeSteps = () => {
    if(!selectedRecipe) {
      return;
    }
    const seq = selectedRecipe.sequence || [];

    const base: Step[] = seq.map((s: any, idx: number) => ({
      step: idx + 1,
      label: s.label || `Step ${idx + 1}`,
      command: s.action,
      status: undefined,
      message: "",
      startedAt: null,
      durationMs: 0,
    }));

    setSteps(base);
};


  // Temporizador global (cada 200 ms) para actualizar RUNNING
  useEffect(() => {
    const t = setInterval(() => {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.status === "RUNNING" && s.startedAt) {
            return { ...s, durationMs: Date.now() - s.startedAt };
          }
          return s;
        })
      );
    }, 200);
    return () => clearInterval(t);
  }, []);

  // --------------------------------------------------------
  // 1) Cargar secuencia al seleccionar receta
  // --------------------------------------------------------
  useEffect(() => {
    if (!selectedRecipe) {
      setSteps([]);
      return;
    }
    initializeSteps();
  }, [selectedRecipe]);

  // --------------------------------------------------------
  // 2) Merge con resultados
  // --------------------------------------------------------
  useEffect(() => {
    if (!results?.results) return;

    setSteps((prev) => {
      const merged = [...prev];

      results.results.forEach((res: Step) => {
        const idx = merged.findIndex((s) => s.step === res.step);

        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            ...res,
            response_time_ms: res.response_time_ms,
          };

          // Si hay resultado final, congelar duración
          if (res.status === "PASS" || res.status === "FAIL" || res.status === "ERROR") {
            if (merged[idx].startedAt)
              merged[idx].durationMs = Date.now() - (merged[idx].startedAt || Date.now());
            merged[idx].startedAt = null;
          }
        } else {
          merged.push(res);
        }
      });

      return merged;
    });
  }, [results]);

  // --------------------------------------------------------
  // 2.5) MANUAL + AUTO: Finalizar paso y resetear si es modo manual
  // --------------------------------------------------------
  useEffect(() => {
    if (!results) return;

    const isManual =
      mode === "manual" ||
      results.type === "manual" ||
      results.manual_step !== undefined;

    setSteps((prev) => {
      const merged = [...prev];

      const resultArray = results.results || [results];

      resultArray.forEach((res: any) => {
        const idx = merged.findIndex((s) => s.step === res.step);
        if (idx < 0) return;

        // Si es un resultado final, cerrarlo
        if (["PASS", "FAIL", "ERROR"].includes(res.status || "")) {
          merged[idx] = {
            ...merged[idx],
            status: res.status,
            message: res.message,
            startedAt: null,
            durationMs: merged[idx].startedAt
              ? Date.now() - (merged[idx].startedAt || Date.now())
              : merged[idx].durationMs,
          };
        }
      });

      return merged;
    });

    // Resetar checklist después de mostrar resultado manual
    if (isManual) {
      setTimeout(() => {
        initializeSteps();
      }, 600);
    }
  }, [results, mode]);

  // --------------------------------------------------------
  // 3) RUNNING & DONE states
  // --------------------------------------------------------
  useEffect(() => {
    if (mode === "manual") return;  // <---- LÍNEA CLAVE
    if(status?.status === "IDLE"){
      initializeSteps();
      return;
    }
    if (!status?.current_step) return;
    const cur = status.current_step;

    setSteps((prev) =>
      prev.map((s) => {
        if (s.step === cur) {
          // activar RUNNING si no estaba corriendo
          if (s.status !== "RUNNING") {
            return {
              ...s,
              status: "RUNNING",
              message: status.message,
              startedAt: Date.now(),
              durationMs: 0,
            };
          }
          return { ...s, message: status.message };
        }

        // marcar DONE si era RUNNING
        if (s.status === "RUNNING" && s.step !== cur) {
          return {
            ...s,
            status: "DONE",
            startedAt: null,
            durationMs: s.durationMs,
          };
        }

        return s;
      })
    );
  }, [status]);

  // --------------------------------------------------------
  // 3.5) MANUAL MODE: marcar RUNNING al iniciar un paso manual
  // --------------------------------------------------------
  useEffect(() => {
    if (mode !== "manual") return;
    if (!results) return;

    // Formatos posibles del firmware
    const manualStep =
      results.manual_step ||
      results.step ||
      (results.results?.[0]?.step ?? null);

    if (!manualStep) return;

    // Marcar el paso como RUNNING
    setSteps((prev) =>
      prev.map((s) =>
        s.step === manualStep
          ? {
              ...s,
              status: "RUNNING",
              startedAt: Date.now(),
              durationMs: 0,
            }
          : s
      )
    );
  }, [results, mode]);

  // --------------------------------------------------------
  // Colores del estado
  // --------------------------------------------------------
  const color = (s?: string) => {
    switch (s) {
      case "PASS":
      case "DONE":
        return "bg-green-500";
      case "RUNNING":
        return "bg-yellow-400 animate-pulse";
      case "FAIL":
      case "ERROR":
        return "bg-red-500";
      default:
        return "bg-slate-700";
    }
  };

  const orderedSteps = [...steps].sort((a, b) => a.step - b.step);

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------
  const formatMs = (ms?: number) =>
    ms ? `${(ms / 1000).toFixed(2)}s` : "";

  const republish = () => {
    if (selectedRecipe) publishRecipeFull(selectedRecipe);
  };

  return (
    <Panel title="Step Checklist">
      {!orderedSteps.length ? (
        <div className="text-sm opacity-70">
          Selecciona una receta para ver los pasos...
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
          {orderedSteps.map((s) => (
            <div
              key={s.step}
              className={`
                break-inside-avoid 
                mb-4 pb-2 border-b border-slate-800 
                flex items-start justify-between gap-3
                ${s.status === "RUNNING" ? "border-yellow-400" : ""}
              `}
            >
              <div className="flex items-center gap-2">
          
                <span className={`h-3 w-3 rounded-full ${color(s.status)}`} />

                <div className="flex flex-col">
                  <span className="font-semibold">{s.label}</span>

                  <span className="opacity-70">
                    {s.command || s.message}
                  </span>

                  <span className="text-xs opacity-60">
                    {s.response_time_ms
                      ? `RT: ${formatMs(s.response_time_ms)}`
                      : s.status === "RUNNING"
                      ? `Tiempo: ${formatMs(s.durationMs)}`
                      : s.durationMs
                      ? `Duración: ${formatMs(s.durationMs)}`
                      : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-xs ${
                    s.status === "FAIL" || s.status === "ERROR"
                      ? "text-red-400"
                      : s.status === "PASS"
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  {s.status || ""}
                </span>

                {mode === "manual" && (
                  <button
                    onClick={() => runManualStep(s.step)}
                    disabled={s.status === "RUNNING"}
                    className={`
                      px-2 py-1 rounded text-[10px] border
                      ${s.status === "RUNNING"
                        ? "border-slate-400 text-slate-400 cursor-not-allowed"
                        : "border-yellow-400 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-400 hover:text-black dark:hover:text-black"}
                    `}
                  >
                    Ejecutar paso
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );

}
