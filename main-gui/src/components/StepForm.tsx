import React, { useMemo } from "react";
import type { RecipeStep, StepAction } from "../types/Recipe";
import SmartNumberInput from "./SmartNumberInput";

type Props = {
  step: RecipeStep;
  onChange: (next: RecipeStep) => void;
};

function StepForm({ step, onChange }: Props) {
  const p = step.parameters ?? {};
  const e = step.expect ?? {};

  const setParam = (k: string, v: any) =>
    onChange({ ...step, parameters: { ...p, [k]: v } });

  const setExpect = (k: string, v: any) =>
    onChange({ ...step, expect: { ...e, [k]: v } });

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="text-xs md:text-sm block">
      <span className="opacity-70">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );

  const inputBase =
    "w-full rounded px-3 py-2 transition border " +
    "bg-slate-200 text-slate-900 border-slate-300 " +
    "focus:ring-2 focus:ring-blue-400 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:focus:ring-blue-500";

  const selectBase =
    "w-full rounded px-3 py-2 transition border cursor-pointer " +
    "bg-slate-200 text-slate-900 border-slate-300 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";

  const number = (v: any) => (v === "" || v === undefined ? "" : Number(v));

  const actionFields = useMemo(() => {
    switch (step.action) {
            case "command_position":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Position (%)">
              <SmartNumberInput
                className={inputBase}
                min={0}
                max={100}
                value={p.position ?? ""}
                onChange={(v) => setParam("position", v)}
              />
            </Field>

            <Field label="Final pos > (%) [expect]">
              <input
                className={inputBase}
                type="number"
                value={e.final_position_greater_than ?? ""}
                onChange={(ev) =>
                  setExpect("final_position_greater_than", number(ev.target.value))
                }
              />
            </Field>

            <Field label="Final pos < (%) [expect]">
              <input
                className={inputBase}
                type="number"
                value={e.final_position_less_than ?? ""}
                onChange={(ev) =>
                  setExpect("final_position_less_than", number(ev.target.value))
                }
              />
            </Field>

            <Field label="Timeout (ms)">
              <input
                className={inputBase}
                type="number"
                value={e.timeout_ms ?? ""}
                onChange={(ev) => setExpect("timeout_ms", number(ev.target.value))}
              />
            </Field>
          </div>
        );

      case "wait":
        return (
          <Field label="Duration (ms)">
            <input
              className={inputBase}
              type="number"
              value={p.duration_ms ?? ""}
              onChange={(ev) => setParam("duration_ms", number(ev.target.value))}
            />
          </Field>
        );

      case "custom_frame":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Frame ID (dec/hex)">
              <input
                className={inputBase}
                placeholder="0x18FF0E63"
                value={p.frame_id ?? ""}
                onChange={(e) => setParam("frame_id", e.target.value)}
              />
            </Field>

            <Field label="Bytes (8, hex o dec con comas)">
              <input
                className={inputBase}
                placeholder="60,58,89,A8,00,17,00,00"
                value={p.frame_data ?? ""}
                onChange={(e) => setParam("frame_data", e.target.value)}
              />
            </Field>

            <Field label="Expect response">
              <select
                className={selectBase}
                value={p.expect_response ? "1" : "0"}
                onChange={(e) => setParam("expect_response", e.target.value === "1")}
              >
                <option value="0">No</option>
                <option value="1">Sí</option>
              </select>
            </Field>
          </div>
        );

      case "set_flag":
      case "read_pid":
      case "motor_off":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="PID Major">
              <input
                className={inputBase}
                type="number"
                value={p.pid_major ?? ""}
                onChange={(ev) => setParam("pid_major", number(ev.target.value))}
              />
            </Field>

            <Field label="PID Minor">
              <input
                className={inputBase}
                type="number"
                value={p.pid_minor ?? ""}
                onChange={(ev) => setParam("pid_minor", number(ev.target.value))}
              />
            </Field>

            {step.action === "set_flag" && (
              <>
                <Field label="Bit Index (0..7)">
                  <input
                    className={inputBase}
                    type="number"
                    value={p.bit_index ?? ""}
                    onChange={(ev) => setParam("bit_index", number(ev.target.value))}
                  />
                </Field>

                <Field label="Bit State">
                  <select
                    className={selectBase}
                    value={p.bit_state ? "1" : "0"}
                    onChange={(e) => setParam("bit_state", e.target.value === "1")}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                  </select>
                </Field>
              </>
            )}

            {step.action === "motor_off" && (
              <Field label="Final pos < (%) [expect]">
                <input
                  className={inputBase}
                  type="number"
                  value={e.final_position_less_than ?? ""}
                  onChange={(ev) =>
                    setExpect("final_position_less_than", number(ev.target.value))
                  }
                />
              </Field>
            )}

            <Field label="Timeout (ms) [expect]">
              <input
                className={inputBase}
                type="number"
                value={e.timeout_ms ?? ""}
                onChange={(ev) => setExpect("timeout_ms", number(ev.target.value))}
              />
            </Field>
          </div>
        );

            case "clear_codes":
        return (
          <div className="text-xs opacity-70">
            Usará el flujo definido en firmware.
          </div>
        );

      case "read_temp":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Rango mínimo (°C)">
              <input
                className={inputBase}
                type="number"
                value={e.min ?? ""}
                onChange={(ev) => setExpect("min", number(ev.target.value))}
              />
            </Field>

            <Field label="Rango máximo (°C)">
              <input
                className={inputBase}
                type="number"
                value={e.max ?? ""}
                onChange={(ev) => setExpect("max", number(ev.target.value))}
              />
            </Field>

            <Field label="Timeout (ms)">
              <input
                className={inputBase}
                type="number"
                value={e.timeout_ms ?? ""}
                onChange={(ev) => setExpect("timeout_ms", number(ev.target.value))}
              />
            </Field>
          </div>
        );

      case "read_status_code":
        return (
          <Field label="Timeout (ms)">
            <input
              className={inputBase}
              type="number"
              value={e.timeout_ms ?? ""}
              onChange={(ev) => setExpect("timeout_ms", number(ev.target.value))}
            />
          </Field>
        );

      default:
        return null;
    }
  }, [step, p, e]);

  return (
    <div className="space-y-4">
      {/* LABEL */}
      <label className="text-xs md:text-sm block">
        <span className="opacity-70">Label</span>
        <input
          className={inputBase + " mt-1"}
          value={step.label ?? ""}
          onChange={(e) =>
            onChange({ ...step, label: e.target.value })
          }
          placeholder="Descripción corta del paso"
        />
      </label>

      {actionFields}
    </div>
  );
}

export default React.memo(
  StepForm,
  (prev, next) => prev.step.id === next.step.id && prev.step === next.step
);
