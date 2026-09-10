import { useMemo, useState, useEffect } from "react";
import { Panel } from "./Panel";
import StepForm from "./StepForm";
import { uid } from "../utils/uid";
import { getTopics } from "../mqtt/topics";
import { useMqttStore } from "../store/useMqttStore";
import { useRecipesStore } from "../state/useRecipeStore";
import { useToastStore } from "../store/useToastStore";
import { useLogStore } from "../state/useLogStore";
import type { RecipeDoc, RecipeStep, StepAction } from "../types/Recipe";
import { useProfilesStore } from "../state/useProfilesStore";
import ProfileEditor from "./ProfileEditor";

const ACTIONS: StepAction[] = [
  "command_position",
  "custom_frame",
  "wait",
  "set_flag",
  "read_pid",
  "motor_off",
  "clear_codes",
];

const templateFor = (action: StepAction): RecipeStep => {
  switch (action) {
    case "command_position":
      return {
        id: uid(),
        action,
        parameters: { position: 0 },
        expect: { timeout_ms: 250 },
      };
    case "wait":
      return { id: uid(), action, parameters: { duration_ms: 1000 } };
    case "custom_frame":
      return {
        id: uid(),
        action,
        parameters: { frame_id: "", frame_data: "", expect_response: true },
        expect: { timeout_ms: 1000 },
      };
    case "set_flag":
      return {
        id: uid(),
        action,
        parameters: { pid_major: 0, pid_minor: 0, bit_index: 0, bit_state: 1 },
      };
    case "read_pid":
      return {
        id: uid(),
        action,
        parameters: { pid_major: 0, pid_minor: 0 },
        expect: { timeout_ms: 1000 },
      };
    case "motor_off":
      return {
        id: uid(),
        action,
        parameters: { pid_major: 0, pid_minor: 0 },
        expect: { final_position_less_than: 5, timeout_ms: 2000 },
      };
    case "clear_codes":
      return { id: uid(), action };
  }
};

export default function RecipeEditor() {
  const publish = useMqttStore((s) => s.publish);
  const pushToast = useToastStore((s) => s.push);
  const rt = getTopics();

  const { recipes, selectedId, update } = useRecipesStore();
  const { profiles, add: addProfile } = useProfilesStore();

  const selectedRecipe = recipes.find((r) => r.id === selectedId);
  const loadProfile = useProfilesStore((s) => s.loadFromStorage);

  const [meta, setMeta] = useState<Partial<RecipeDoc>>({});
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  // Carga receta
  useEffect(() => {
    if (selectedRecipe) {
      setMeta(selectedRecipe);
      setSteps(selectedRecipe.sequence || []);
      setSel((prev) =>
        prev && selectedRecipe.sequence?.some((s) => s.id === prev)
          ? prev
          : selectedRecipe.sequence?.[0]?.id ?? null
      );
    } else {
      setMeta({});
      setSteps([]);
      setSel(null);
    }
  }, [selectedRecipe]);

  // Actualiza store al editar
  useEffect(() => {
    if (!selectedId || !meta) return;

    const current = recipes.find((r) => r.id === selectedId);
    if (!current) return;

    const next = { ...meta, sequence: steps };
    const same =
      JSON.stringify(current.sequence) === JSON.stringify(next.sequence) &&
      JSON.stringify({ ...current, sequence: undefined }) ===
        JSON.stringify({ ...next, sequence: undefined });

    if (same) return;

    const t = setTimeout(() => {
      update(selectedId, next);
    }, 400);

    return () => clearTimeout(t);
  }, [meta, steps, selectedId, recipes]);

  const selected = useMemo(
    () => steps.find((s) => s.id === sel) ?? null,
    [steps, sel]
  );

  const updateSelected = (next: RecipeStep) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === next.id
          ? {
              ...s,
              parameters: { ...s.parameters, ...next.parameters },
              expect: { ...s.expect, ...next.expect },
              label: next.label,
            }
          : s
      )
    );
  };

  const addStep = (action: StepAction) => {
    const t = templateFor(action);
    setSteps((prev) => [...prev, t]);
    setSel(t.id);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setSel((prev) => (prev === id ? null : prev));
  };

  const move = (id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const cp = [...prev];
      const [item] = cp.splice(idx, 1);
      cp.splice(j, 0, item);
      return cp;
    });
  };

  // JSON para firmware
  const toFirmwareJson = (): RecipeDoc => {
    const seq = steps.map((s) => {
      const out: any = { ...s };

      if (s.action === "custom_frame") {
        const d = (s.parameters?.frame_data ?? "") as string;
        const arr = d
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .map((v) => {
            if (/^0x/i.test(v)) return parseInt(v, 16);
            if (/^[0-9a-fA-F]{2}$/.test(v)) return parseInt(v, 16);
            return parseInt(v, 10);
          });

        out.parameters = {
          ...s.parameters,
          frame_id: (() => {
            const raw = s.parameters?.frame_id ?? "";
            if (typeof raw === "string" && /^0x/i.test(raw))
              return parseInt(raw, 16);
            return Number(raw) || 0;
          })(),
          frame_data: arr.slice(0, 8),
        };
      }

      return out;
    });

    return {
      id: meta.id || uid(),
      schema: meta.schema as any,
      testID: meta.testID,
      family: meta.family,
      job_id: meta.job_id,
      serial: meta.serial,
      profile_id: meta.profile_id,
      sequence: seq,
      limits: { max_response_time_ms: 250 },
      logging: { save_raw_messages: true, save_response_times: true },
      timestamp: new Date().toISOString(),
    };
  };

  const publishRecipe = () => {
    const payload = toFirmwareJson();
    const profile = profiles.find((p) => p.id === payload.profile_id);

    if (profile) {
      const topic = rt.profile(profile.name ?? "default");
      publish(topic, profile);
      useLogStore
        .getState()
        .add({
          topic,
          type: "info",
          message: `Perfil ${profile.name} enviado`,
          data: profile,
        });
      pushToast(`Perfil "${profile.name}" publicado`, "success");
    } else {
      pushToast("⚠️ Receta sin perfil asociado", "warn");
    }

    publish(rt.recipe, payload);
    useLogStore
      .getState()
      .add({
        topic: rt.recipe,
        type: "info",
        message: "Receta publicada",
        data: payload,
      });
    pushToast("Receta publicada exitosamente", "success");
  };

  if (!selectedRecipe) {
    return (
      <Panel title="Editor de receta">
        <div className="text-sm opacity-70">
          Selecciona o crea una receta desde la izquierda.
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

      {/* LISTA DE PASOS */}
      <Panel title="Pasos" className="col-span-1">

        {/* Botones de acciones */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => addStep(a)}
              className="
                px-3 py-1 text-xs rounded border transition

                bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300
                dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700
              "
            >
              + {a}
            </button>
          ))}
        </div>

        {/* Lista scrollable */}
        <ul className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`
                p-2 rounded border cursor-pointer transition

                bg-slate-200 border-slate-300 hover:bg-slate-300
                dark:bg-slate-800/70 dark:border-slate-700 dark:hover:bg-slate-700

                ${sel === s.id ? "ring-2 ring-accent" : ""}
              `}
              onClick={() => setSel(s.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="opacity-60 mr-2">{i + 1}.</span>
                  <span className="font-semibold">{s.label || s.action}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      move(s.id, -1);
                    }}
                    className="
                      px-2 py-1 text-xs rounded border transition
                      bg-slate-300 border-slate-400
                      hover:bg-slate-200
                      dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600
                    "
                  >
                    ↑
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      move(s.id, 1);
                    }}
                    className="
                      px-2 py-1 text-xs rounded border transition
                      bg-slate-300 border-slate-400
                      hover:bg-slate-200
                      dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600
                    "
                  >
                    ↓
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(s.id);
                    }}
                    className="
                      px-2 py-1 text-xs rounded border
                      bg-red-600 border-red-700 text-white
                      hover:bg-red-500
                    "
                  >
                    Del
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* FORM SELECTED STEP */}
      <Panel title="Editor de paso" className="col-span-1">
        {!selected ? (
          <div className="text-sm opacity-70">
            Selecciona un paso para editar.
          </div>
        ) : (
          <StepForm step={selected} onChange={updateSelected} />
        )}
      </Panel>

      {/* META — PROFILE — JSON PREVIEW — PUBLISH */}
      <Panel title="Metadatos y publicación de receta" className="col-span-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

          {/* SELECT PERFIL */}
          <label className="text-sm capitalize">
            Perfil asociado
            <select
              className="
                w-full px-3 py-2 mt-1 rounded border transition

                bg-slate-200 text-slate-800 border-slate-300
                focus:ring-2 focus:ring-blue-400

                dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
                dark:focus:ring-blue-500
              "
              value={meta.profile_id ?? ""}
              onChange={(e) => {
                const value = e.target.value;

                if (value === "__new__") {
                  const newId = addProfile("CAN");
                  const updated = { ...meta, profile_id: newId };
                  setMeta(updated);
                  if (selectedId) update(selectedId, updated);
                  setShowProfileEditor(true);
                  return;
                }

                const updated = { ...meta, profile_id: value || undefined };
                setMeta(updated);
                if (selectedId) update(selectedId, updated);
              }}
            >
              <option value="">-- Ninguno --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.protocol})
                </option>
              ))}
              <option value="__new__">➕ Crear nuevo perfil…</option>
            </select>
          </label>

          {meta.profile_id && (
            <button
              onClick={() => setShowProfileEditor(true)}
              className="
                px-3 py-1 rounded font-bold border transition

                bg-blue-600 text-white border-blue-700 hover:bg-blue-500
              "
            >
              Editar perfil asociado
            </button>
          )}

          {/* Meta fields */}
          {["schema", "family", "testID", "job_id", "serial"].map((field) => (
            <label key={field} className="text-sm capitalize">
              {field}
              <input
                className="
                  w-full px-3 py-2 mt-1 rounded border transition
                  bg-slate-200 text-slate-800 border-slate-300
                  focus:ring-2 focus:ring-blue-400

                  dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
                  dark:focus:ring-blue-500
                "
                value={(meta as any)[field] ?? ""}
                onChange={(e) => {
                  const updated = { ...meta, [field]: e.target.value };
                  setMeta(updated);
                  if (selectedId) {
                    update(selectedId, updated);
                    pushToast("Cambios guardados", "success");
                  }
                }}
              />
            </label>
          ))}
        </div>

        {/* JSON Preview */}
        <div className="text-xs mb-3 opacity-70">
          Preview JSON (lo que se envía al PMC)
        </div>

        <pre
          className="
            p-3 rounded text-xs overflow-auto max-h-56 border transition

            bg-slate-200 text-slate-800 border-slate-300
            dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700
          "
        >
          {JSON.stringify(toFirmwareJson(), null, 2)}
        </pre>

        {/* Botones publicación */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={publishRecipe}
            className="
              px-4 py-2 rounded font-bold border transition

              bg-accent text-black border-yellow-400
              hover:bg-yellow-300
            "
          >
            Publish Recipe
          </button>

          <button
            onClick={() => {
              const ctrl = { schema: "pmc.control/1", cmd: "START" };
              publish(rt.control, ctrl);
              pushToast("Inicio enviado al PMC", "info");
            }}
            className="
              px-4 py-2 rounded font-bold border transition

              bg-purple-600 text-white border-purple-700
              hover:bg-purple-500
            "
          >
            Start Test
          </button>
        </div>
      </Panel>

      {/* MODAL PROFILE EDITOR */}
      {showProfileEditor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div
            className="
              rounded-lg p-6 w-[80%] max-w-3xl border transition

              bg-white border-slate-300 text-slate-900
              dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
            "
          >
            <ProfileEditor
              profileId={meta.profile_id ?? null}
              onClose={() => setShowProfileEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
