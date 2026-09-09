import { useEffect, useRef } from "react";
import { Panel } from "./Panel";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { setRemoteMode } from "../utils/manualControl";
import { useToastStore } from "../store/useToastStore";

export default function ModeSelectorPanel() {
  const mode = useRuntimeStore((s) => s.mode);
  const modePending = useRuntimeStore((s) => s.modePending);
  const setModePending = useRuntimeStore((s) => s.setModePending);
  const pushToast = useToastStore((s) => s.push);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevModeRef = useRef<typeof mode>(mode);

  const requestMode = (m: "auto" | "manual") => {
    if (m === mode) return;
    if (modePending) return;

    setModePending(true);
    setRemoteMode(m);

    // Timeout de seguridad
    timeoutRef.current = setTimeout(() => {
      console.error("[HMI] Timeout esperando confirmación de modo del PMC");
      pushToast("Error: no se recibió confirmación de cambio de modo", "error");
      setModePending(false);
    }, 3000);
  };

  // Detecta cuando cambia el modo (ACK desde MQTT)
  useEffect(() => {
    const unsub = useRuntimeStore.subscribe((s) => {
      if (prevModeRef.current !== s.mode) {
        prevModeRef.current = s.mode;

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;

          pushToast(
            `Modo cambiado a ${s.mode === "auto" ? "Automático" : "Manual"}`,
            "success"
          );

          setModePending(false);
        }
      }
    });

    return () => unsub();
  }, []);

  return (
    <Panel title="Modo de operación">
      <div className="flex gap-3">

        {/* BOTÓN AUTOMÁTICO */}
        <button
          disabled={modePending}
          onClick={() => requestMode("auto")}
          className={`
            px-4 py-2 rounded text-sm font-semibold border transition

            ${mode === "auto"
              ? "bg-green-500 border-green-600 text-black"
              : `
                bg-slate-200 border-slate-300 text-slate-800 
                hover:bg-slate-300 
                dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 
                dark:hover:bg-slate-700
              `
            }

            ${modePending ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {modePending && mode !== "auto" ? "Cambiando..." : "Automático"}
        </button>

        {/* BOTÓN MANUAL */}
        <button
          disabled={modePending}
          onClick={() => requestMode("manual")}
          className={`
            px-4 py-2 rounded text-sm font-semibold border transition

            ${mode === "manual"
              ? "bg-yellow-400 border-yellow-500 text-black"
              : `
                bg-slate-200 border-slate-300 text-slate-800 
                hover:bg-slate-300
                dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 
                dark:hover:bg-slate-700
              `
            }

            ${modePending ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {modePending && mode !== "manual" ? "Cambiando..." : "Manual"}
        </button>

      </div>

      <p
        className="
          mt-2 text-xs 
          text-slate-600 
          dark:text-slate-400
        "
      >
        En <span className="font-semibold">Manual</span>, cada paso puede ejecutarse
        de forma independiente desde el checklist.
      </p>
    </Panel>
  );
}
