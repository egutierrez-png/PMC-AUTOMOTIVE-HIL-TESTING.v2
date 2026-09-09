import { useRef, useEffect } from "react";
import { Panel } from "./Panel";
import { useProfilesStore } from "../state/useProfilesStore";
import { signalRegistry } from "../components/signals/registry/registry";
import { useSignalsStore } from "../state/useSignalsStore";

export default function ProfileLibrary() {
  const {
    profiles,
    selectedId,
    select,
    add,
    duplicate,
    remove,
    exportToFile,
    exportAllToFile,
    importFromFile,
    importMultipleFromFile,
    loadFromStorage,
  } = useProfilesStore();

  const fileInputOne = useRef<HTMLInputElement | null>(null);
  const fileInputMultiple = useRef<HTMLInputElement | null>(null);

  // Load profiles on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleImportOne = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFromFile(file);
  };

  const handleImportMultiple = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMultipleFromFile(file);
  };

  return (
    <Panel title="Profiles" className="col-span-3 lg:col-span-1">
      <div className="space-y-3">

        {/* ---------------- NEW PROFILE BUTTONS ---------------- */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => add("CAN")}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-green-600 hover:bg-green-500 text-black
              dark:bg-green-500 dark:hover:bg-green-400
            "
          >
            ➕ Nuevo Perfil CAN
          </button>

          <button
            onClick={() => add("UART")}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-blue-600 hover:bg-blue-500 text-black
              dark:bg-blue-500 dark:hover:bg-blue-400
            "
          >
            ➕ Nuevo Perfil UART
          </button>

          <button
            onClick={() => add("LIN")}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-purple-600 hover:bg-purple-500 text-black
              dark:bg-purple-500 dark:hover:bg-purple-400
            "
          >
            ➕ Nuevo Perfil LIN
          </button>
        </div>

        {/* ---------------- PROFILE LIST ---------------- */}
        <div className="mt-4 space-y-1 max-h-[55vh] overflow-auto pr-1">
          {profiles.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                select(p.id);

                const sel = useProfilesStore
                  .getState()
                  .profiles.find((pr) => pr.id === p.id);

                signalRegistry.loadProfileMap(sel?.signalMap);
                useSignalsStore.getState().clear();
              }}
              className={`
                flex justify-between items-center px-3 py-2 rounded cursor-pointer transition-colors
                ${
                  selectedId === p.id
                    ? "bg-accent text-black font-semibold"
                    : "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }
              `}
            >
              <span className="truncate">
                {p.name}
                <span className="text-xs opacity-70 ml-1">
                  ({p.protocol})
                </span>
              </span>

              <div className="flex items-center gap-2">

                {/* Duplicate */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate(p.id);
                  }}
                  className="
                    text-xs transition
                    text-yellow-600 hover:text-yellow-400
                    dark:text-yellow-400 dark:hover:text-yellow-300
                  "
                  title="Duplicate"
                >
                  ⧉
                </button>

                {/* Export */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToFile(p.id);
                  }}
                  className="
                    text-xs transition
                    text-blue-600 hover:text-blue-400
                    dark:text-blue-300 dark:hover:text-blue-200
                  "
                  title="Export"
                >
                  ⬇
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p.id);
                  }}
                  className="
                    text-xs transition
                    text-red-600 hover:text-red-400
                    dark:text-red-400 dark:hover:text-red-300
                  "
                  title="Delete"
                >
                  ✕
                </button>

              </div>
            </div>
          ))}
        </div>

        {/* ---------------- IMPORT / EXPORT ---------------- */}
        <div className="mt-4 flex flex-col gap-2">

          <button
            onClick={() => fileInputOne.current?.click()}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-blue-700 hover:bg-blue-600 text-black
              dark:bg-blue-600 dark:hover:bg-blue-500
            "
          >
            📥 Importar Perfil (uno)
          </button>

          <button
            onClick={() => fileInputMultiple.current?.click()}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-indigo-700 hover:bg-indigo-600 text-black
              dark:bg-indigo-600 dark:hover:bg-indigo-500
            "
          >
            📂 Importar Perfiles (múltiples)
          </button>

          <button
            onClick={exportAllToFile}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-yellow-600 hover:bg-yellow-500 text-black
              dark:bg-yellow-500 dark:hover:bg-yellow-400
            "
          >
            📦 Exportar Todos
          </button>

          {/* Hidden file inputs */}
          <input
            ref={fileInputOne}
            type="file"
            accept=".json"
            onChange={handleImportOne}
            className="hidden"
          />

          <input
            ref={fileInputMultiple}
            type="file"
            accept=".json"
            onChange={handleImportMultiple}
            className="hidden"
          />
        </div>
      </div>
    </Panel>
  );
}
