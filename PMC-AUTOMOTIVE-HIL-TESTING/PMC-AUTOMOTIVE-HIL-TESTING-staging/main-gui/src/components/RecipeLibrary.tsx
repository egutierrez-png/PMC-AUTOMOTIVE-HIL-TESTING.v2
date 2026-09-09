import { useEffect, useRef } from "react";
import { useRecipesStore } from "../state/useRecipeStore";
import { Panel } from "./Panel";

export default function RecipeLibrary() {
  const {
    recipes,
    selectedId,
    select,
    add,
    remove,
    duplicate,
    exportToFile,
    exportAllToFile,
    importFromFile,
    importMultipleFromFile,
    loadFromStorage,
  } = useRecipesStore();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const multiInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFromFile(file);
  };

  const handleImportMultiple = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMultipleFromFile(file);
  };

  const rowBase =
    "flex justify-between items-center px-3 py-2 rounded cursor-pointer transition border " +
    "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 " +
    "dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200";

  return (
    <Panel title="Recipe Library" className="col-span-3 lg:col-span-1">
      <div className="space-y-2">
        {/* LISTADO */}
        {recipes.map((r: any) => {
          const selected = selectedId === r.id;

          return (
            <div
              key={r.id}
              onClick={() => select(r.id)}
              className={
                selected
                  ? `${rowBase} bg-accent text-black font-semibold border-accent`
                  : rowBase
              }
            >
              {/* TITLE */}
              <span className="truncate">
                {r.job_id || "Untitled"}{" "}
                <span className="text-xs opacity-70">
                  ({r.family || "GENERIC"})
                </span>
              </span>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate(r.id);
                  }}
                  className="text-xs text-yellow-500 hover:text-yellow-300 dark:text-yellow-400 dark:hover:text-yellow-200"
                  title="Duplicate"
                >
                  ⧉
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToFile(r.id);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Export"
                >
                  ⬇
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(r.id);
                  }}
                  className="text-xs text-red-600 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {/* ACTIONS */}
        <div className="mt-4 flex flex-col gap-2">

          {/* NUEVA RECETA */}
          <button
            onClick={() =>
              add({
                job_id: `WO-${Math.floor(Math.random() * 999999)
                  .toString()
                  .padStart(6, "0")}`,
                family: "VTG_JD",
              })
            }
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-green-600 hover:bg-green-500 text-black
            "
          >
            ➕ Nueva Receta
          </button>

          {/* IMPORT ONE */}
          <button
            onClick={() => fileInput.current?.click()}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-blue-600 hover:bg-blue-500 text-black
            "
          >
            📥 Importar JSON (una)
          </button>

          {/* IMPORT MULTIPLE */}
          <button
            onClick={() => multiInput.current?.click()}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-indigo-600 hover:bg-indigo-500 text-black
            "
          >
            📂 Importar Múltiple
          </button>

          {/* EXPORT ALL */}
          <button
            onClick={exportAllToFile}
            className="
              w-full text-left px-3 py-2 rounded font-semibold transition
              bg-yellow-600 hover:bg-yellow-500 text-black
            "
          >
            📦 Exportar Todo
          </button>

          {/* FILE INPUTS */}
          <input
            type="file"
            accept=".json"
            ref={fileInput}
            onChange={handleImport}
            className="hidden"
          />

          <input
            type="file"
            accept=".json"
            ref={multiInput}
            onChange={handleImportMultiple}
            className="hidden"
          />
        </div>
      </div>
    </Panel>
  );
}
