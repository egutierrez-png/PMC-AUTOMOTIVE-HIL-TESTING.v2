import { Panel } from "./Panel";
import { motion } from "framer-motion";
import { useRecipesStore } from "../state/useRecipeStore";
import { useProfilesStore } from "../state/useProfilesStore";
import { useMqttStore } from "../store/useMqttStore";
import { useToastStore } from "../store/useToastStore";
import { getTopics } from "../mqtt/topics";
import { useRuntimeStore } from "../state/useRuntimeStore";

const rt = getTopics();

type ControlsButtonKey = "sendProfile" | "startTest" | "abortTest" | "queryStatus";

type ControlsPanelProps = {
  className?: string;
  layout?: "vertical" | "horizontal";
  visibleButtons?: Partial<Record<ControlsButtonKey, boolean>>;
};

const defaultVisibleButtons: Record<ControlsButtonKey, boolean> = {
  sendProfile: true,
  startTest: true,
  abortTest: true,
  queryStatus: true,
};

export const ControlsPanel = ({
  className = "",
  layout = "vertical",
  visibleButtons,
}: ControlsPanelProps) => {
  const publish = useMqttStore((s) => s.publish);
  const pushToast = useToastStore((s) => s.push);

  const mode = useRuntimeStore((s) => s.mode);
  const isManual = mode === "manual";

  const { recipes, selectedId } = useRecipesStore();
  const { profiles } = useProfilesStore();

  const selectedRecipe = recipes.find((r) => r.id === selectedId);
  const selectedProfile =
    profiles.find((p) => p.id === selectedRecipe?.profile_id) ?? null;

  const buttonVisibility = {
    ...defaultVisibleButtons,
    ...visibleButtons,
  };
  const visibleButtonCount = Object.values(buttonVisibility).filter(Boolean).length;

  const sendProfile = () => {
    if (!selectedProfile) {
      pushToast("No hay perfil asignado en receta", "error");
      return;
    }

    publish(rt.profile(selectedProfile.name), selectedProfile);
    pushToast("Perfil enviado al  PMC", "success");
  };

  const startTest = () => {
    publish(rt.control, { schema: "pmc.control/1", cmd: "START" });
    pushToast("Prueba iniciada!", "info");
  };

  const resumeTest = () => {
    publish(rt.control, { schema: "pmc.control/1", cmd: "RESUME" });
    pushToast("Continuando prueba!", "info");
  };

  const abortTest = () => {
    publish(rt.control, { schema: "pmc.control/1", cmd: "ABORT" });
    pushToast("Prueba detenida!", "info");
  };

  const pauseTest = () => {
    publish(rt.control, { schema: "pmc.control/1", cmd: "PAUSE" });
    pushToast("Prueba pausada!", "info");
  };

  return (
    <Panel title="Controles" className={className}>
      {isManual && (
        <div className="text-xs text-yellow-400 mb-2">
          Modo <span className="font-semibold">MANUAL</span> activo — los controles
          automáticos están bloqueados. Use el checklist para ejecutar pasos individuales.
        </div>
      )}
      <div
        className={`${
          isManual ? "opacity-40 pointer-events-none" : ""
        } grid gap-3 ${
          layout === "horizontal"
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1"
        }`}
        style={
          layout === "horizontal"
            ? {
                gridTemplateColumns: `repeat(${Math.max(visibleButtonCount, 1)}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {buttonVisibility.sendProfile && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className="bg-blue-600 text-white font-bold py-2 rounded-lg shadow-md hover:shadow-glow"
            onClick={sendProfile}
          >
            Enviar perfil
          </motion.button>
        )}

        {buttonVisibility.startTest && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className="bg-emerald-500 text-black font-bold py-2 rounded-lg shadow-md hover:shadow-glow"
            onClick={startTest}
          >
            Iniciar prueba
          </motion.button>
        )}

        {/* <motion.button 
        className="bg-yellow-500 text-black font-bold py-2 rounded-lg"
        onClick={pauseTest}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}>
          Pause
        </motion.button>

        <motion.button className="bg-cyan-500 text-black font-bold py-2 rounded-lg"
        onClick={resumeTest}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        >
          Resume
        </motion.button> */}

        {buttonVisibility.abortTest && (
          <motion.button
            className="bg-red-600 text-white font-bold py-2 rounded-lg shadow-md hover:shadow-glow"
            onClick={abortTest}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
          >
            Abortar
          </motion.button>
        )}

        {buttonVisibility.queryStatus && (
          <motion.button className="bg-slate-600 text-white font-bold py-2 rounded-lg">
            Consultar estado
          </motion.button>
        )}
      </div>
    </Panel>
  );
};
