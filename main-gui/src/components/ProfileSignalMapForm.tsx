import { useState, useEffect } from "react";
import type { SignalDefinition } from "../components/signals/registry/type";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { extractPaths } from "../utils/jsonPaths";

type Props = {
  signalMap?: SignalDefinition[];
  onChange: (next: SignalDefinition[]) => void;
  onSelectSignal?: (signal: SignalDefinition) => void;
};

type EditableSignal = SignalDefinition & {
  showSuggestions?: boolean;
  collapsed?: boolean;
};

function validateSignal(sig: SignalDefinition): string[] {
  const errors: string[] = [];

  if (!sig.name || sig.name.trim() === "")
    errors.push("El nombre de la señal es obligatorio.");

  const validSources = ["STATUS", "RESULTS", "CAN", "UART"];
  if (!validSources.includes(sig.source))
    errors.push(`Source inválido: ${sig.source}`);

  if (
    (sig.source === "STATUS" || sig.source === "RESULTS") &&
    (!sig.path || sig.path.trim() === "")
  ) {
    errors.push("Las señales STATUS y RESULTS requieren un path JSON.");
  }

  if (sig.source === "CAN") {
    if (typeof sig.frameId !== "number")
      errors.push("CAN: frameId debe ser un número.");
    if (typeof sig.byteOffset !== "number")
      errors.push("CAN: byteOffset debe ser un número.");
    if (typeof sig.length !== "number" || ![1, 2, 4].includes(sig.length))
      errors.push("CAN: length debe ser 1, 2 o 4.");
    if (!sig.type) errors.push("CAN: type requerido.");
  }

  if (sig.scale !== undefined && isNaN(Number(sig.scale)))
    errors.push("Scale debe ser un número.");

  return errors;
}

export default function ProfileSignalMapForm({
  signalMap = [],
  onChange,
  onSelectSignal,
}: Props) {
  const [local, setLocal] = useState<EditableSignal[]>(signalMap);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const lastStatus = useRuntimeStore((s) => s.lastStatus);
  const lastResults = useRuntimeStore((s) => s.lastResults);

  const statusPaths = lastStatus ? extractPaths(lastStatus) : [];
  const resultPaths =
    lastResults && lastResults.length > 0 ? extractPaths(lastResults[0]) : [];

  const cleanForStore = (arr: EditableSignal[]): SignalDefinition[] =>
    arr.map(({ showSuggestions, collapsed, ...clean }) => clean);

  /**
   * setSignal:
   *  - persist = true  → también llama a onChange (actualiza perfil)
   *  - persist = false → solo afecta UI local (collapsed, showSuggestions, etc.)
   */
  const setSignal = (
    index: number,
    patch: Partial<EditableSignal>,
    options: { persist?: boolean } = {}
  ) => {
    const { persist = true } = options;

    setLocal((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };

      if (persist) {
        onChange(cleanForStore(next));
      }

      return next;
    });
  };

  const addSignal = () => {
    setLocal((prev) => {
      const next: EditableSignal[] = [
        ...prev,
        {
          name: "new_signal",
          source: "STATUS" as const,
          path: "",
          scale: 1,
          collapsed: false,
        },
      ];
      onChange(cleanForStore(next));
      return next;
    });
  };

  const removeSignal = (i: number) => {
    setLocal((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      onChange(cleanForStore(next));
      return next;
    });
  };

  const expandAll = () => {
    setLocal((prev) =>
      prev.map((s) => ({
        ...s,
        collapsed: false,
      }))
    );
    // 👆 solo UI, no llamamos onChange
  };

  const collapseAll = () => {
    setLocal((prev) =>
      prev.map((s) => ({
        ...s,
        collapsed: true,
      }))
    );
    // 👆 solo UI, no llamamos onChange
  };

  useEffect(() => {
    // Cuando cambia el perfil desde afuera, recargamos señales
    // sin tocar nada en el store (ya viene limpio).
    setLocal(signalMap.map((s) => ({ ...s, collapsed: false })));
  }, [signalMap]);

  // --------------------------------------------------
  // Input Styles
  // --------------------------------------------------
  const inputBase =
    "w-full rounded px-2 py-1 mt-1 transition " +
    "bg-slate-100 text-slate-800 border border-slate-300 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 " +
    "focus:border-accent focus:ring-1 focus:ring-accent";

  const cardBase =
    "border rounded p-3 transition cursor-pointer " +
    "bg-white border-slate-300 hover:border-slate-500 " +
    "dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-500";

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mt-4 flex-wrap">
        <button
          onClick={() => {
            const allErrors = local.flatMap((sig, index) =>
              validateSignal(sig).map((e) => `Señal #${index + 1}: ${e}`)
            );
            alert(
              allErrors.length === 0
                ? "✔ No se encontraron errores"
                : "⚠ Errores encontrados:\n\n" + allErrors.join("\n")
            );
          }}
          className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
        >
          🔍 Validar señales
        </button>

        <button
          onClick={addSignal}
          className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-black font-semibold"
        >
          ➕ Añadir señal
        </button>

        <button
          onClick={expandAll}
          className="px-3 py-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-200 text-xs
                     dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          ▷ Expandir todas
        </button>

        <button
          onClick={collapseAll}
          className="px-3 py-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-200 text-xs
                     dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          ▷ Colapsar todas
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-2">
        {local.map((sig, i) => {
          const isSelected = selectedIndex === i;
          const errors = validateSignal(sig);

          return (
            <div
              key={i}
              className={`${cardBase} ${
                isSelected ? "border-accent shadow-md" : ""
              }`}
              onClick={() => {
                setSelectedIndex(i);
                onSelectSignal?.(sig);
              }}
            >
              {/* HEADER */}
              <div
                className="flex justify-between items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setSignal(
                    i,
                    { collapsed: !sig.collapsed },
                    { persist: false } // 👈 solo UI
                  );
                }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      sig.collapsed ? "rotate-0" : "rotate-90"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>

                  <span className="font-semibold text-sm">{sig.name}</span>

                  <span
                    className={`
                      text-[10px] px-2 py-0.5 rounded-full ml-2
                      ${
                        sig.source === "CAN"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : sig.source === "STATUS"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : sig.source === "RESULTS"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                      }
                    `}
                  >
                    {sig.source}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSignal(i);
                  }}
                  className="text-red-500 hover:text-red-300"
                >
                  ✕
                </button>
              </div>

              {/* BODY */}
              <div
                className={`transition-all overflow-hidden ${
                  sig.collapsed
                    ? "max-h-0 opacity-0"
                    : "max-h-[600px] opacity-100 mt-3"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* NAME */}
                  <label className="text-sm">
                    Nombre
                    <input
                      className={inputBase}
                      value={sig.name}
                      onChange={(e) =>
                        setSignal(i, { name: e.target.value }, { persist: true })
                      }
                    />
                  </label>

                  {/* SOURCE */}
                  <label className="text-sm">
                    Source
                    <select
                      className={inputBase}
                      value={sig.source}
                      onChange={(e) =>
                        setSignal(
                          i,
                          { source: e.target.value as any },
                          { persist: true }
                        )
                      }
                    >
                      <option value="STATUS">STATUS</option>
                      <option value="RESULTS">RESULTS</option>
                      <option value="CAN">CAN</option>
                      <option value="UART">UART</option>
                    </select>
                  </label>

                  {/* JSON PATH */}
                  {(sig.source === "STATUS" || sig.source === "RESULTS") && (
                    <label className="text-sm col-span-2 relative">
                      JSON Path
                      <input
                        className={inputBase}
                        value={sig.path ?? ""}
                        onChange={(e) =>
                          setSignal(
                            i,
                            { path: e.target.value },
                            { persist: true }
                          )
                        }
                        onFocus={() =>
                          setSignal(
                            i,
                            { showSuggestions: true },
                            { persist: false }
                          )
                        }
                        onBlur={() =>
                          setTimeout(
                            () =>
                              setSignal(
                                i,
                                { showSuggestions: false },
                                { persist: false }
                              ),
                            200
                          )
                        }
                      />

                      {sig.showSuggestions && (
                        <div
                          className="
                            absolute z-10 mt-1 max-h-40 overflow-auto w-full text-xs
                            bg-slate-100 border border-slate-300 rounded shadow
                            dark:bg-slate-900 dark:border-slate-700
                          "
                        >
                          {(sig.source === "STATUS" ? statusPaths : resultPaths)
                            .filter((p) =>
                              p
                                .toLowerCase()
                                .includes((sig.path ?? "").toLowerCase())
                            )
                            .slice(0, 20)
                            .map((p, idx) => (
                              <div
                                key={idx}
                                className="
                                  px-2 py-1 cursor-pointer 
                                  hover:bg-slate-200 
                                  dark:hover:bg-slate-700
                                "
                                onMouseDown={() =>
                                  setSignal(i, { path: p }, { persist: true })
                                }
                              >
                                {p}
                              </div>
                            ))}
                        </div>
                      )}
                    </label>
                  )}

                  {/* CAN FIELDS */}
                  {sig.source === "CAN" && (
                    <>
                      <label className="text-sm">
                        Frame ID
                        <input
                          className={inputBase}
                          value={sig.frameId ?? ""}
                          onChange={(e) =>
                            setSignal(
                              i,
                              { frameId: Number(e.target.value) },
                              { persist: true }
                            )
                          }
                        />
                      </label>

                      <label className="text-sm">
                        Byte Offset
                        <input
                          type="number"
                          className={inputBase}
                          value={sig.byteOffset ?? 0}
                          onChange={(e) =>
                            setSignal(
                              i,
                              { byteOffset: Number(e.target.value) },
                              { persist: true }
                            )
                          }
                        />
                      </label>

                      <label className="text-sm">
                        Length (1,2,4)
                        <input
                          type="number"
                          className={inputBase}
                          value={sig.length ?? 1}
                          onChange={(e) =>
                            setSignal(
                              i,
                              { length: Number(e.target.value) },
                              { persist: true }
                            )
                          }
                        />
                      </label>

                      <label className="text-sm">
                        Type
                        <select
                          className={inputBase}
                          value={sig.type ?? ""}
                          onChange={(e) =>
                            setSignal(
                              i,
                              {
                                type: e.target
                                  .value as "uint8" | "uint16" | "int16" | "float",
                              },
                              { persist: true }
                            )
                          }
                        >
                          <option value="uint8">uint8</option>
                          <option value="uint16">uint16</option>
                          <option value="int16">int16</option>
                          <option value="float">float</option>
                        </select>
                      </label>
                    </>
                  )}

                  {/* SCALE */}
                  <label className="text-sm col-span-2">
                    Scale
                    <input
                      type="number"
                      step="any"
                      className={inputBase}
                      value={sig.scale ?? 1}
                      onChange={(e) =>
                        setSignal(
                          i,
                          { scale: Number(e.target.value) },
                          { persist: true }
                        )
                      }
                    />
                  </label>
                </div>

                {/* ERRORS */}
                {errors.length > 0 && (
                  <div className="mt-2 text-red-400 text-xs space-y-1">
                    {errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
