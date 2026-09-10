import { v4 as uuid } from "uuid";
import type { RecipeDoc } from "../types/Recipe";

// Genera una etiqueta automática a partir del testID
function autoLabel(testId: string) {
  if (!testId) return "Unnamed Step";
  return testId
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Normaliza frame_data (acepta string o array)
function normalizeFrameData(fd: any): string {
  if (Array.isArray(fd)) {
    return fd.join(", "); // tu UI usa strings
  }
  if (typeof fd === "string") return fd;
  return "";
}

// Normaliza cada step
function normalizeStep(step: any, index: number) {
  const testID = step.testID || step.testId || `STEP_${index}`;
  return {
    testID,
    label: step.label || autoLabel(testID),   // ⭐⭐⭐ FIX CRÍTICO
    action: step.action,
    parameters: {
      ...step.parameters,
      frame_id: step.parameters?.frame_id ?? "",
      frame_data: normalizeFrameData(step.parameters?.frame_data),
      duration_ms: step.parameters?.duration_ms,
      position: step.parameters?.position,
    },
    expect: step.expect ?? {},
  };
}

export function mapExternalRecipe(raw: any): RecipeDoc {
  const seq = Array.isArray(raw.sequence) ? raw.sequence : [];

  return {
    id: uuid(),
    schema: "pmc.recipe/1",
    job_id: raw.job_id || raw.testID || "UNKNOWN_JOB",
    family: raw.family || "GENERIC",
    serial: raw.serial || "UNKNOWN_SN",
    profile_id: raw.profile_id || null,
    limits: raw.limits || { max_response_time_ms: 250 },
    logging: raw.logging || {
      save_raw_messages: true,
      save_response_times: true,
    },
    timestamp: new Date().toISOString(),

    sequence: seq.map((s: any, i: number) => ({
      id: uuid(),                    // ← FIX CRÍTICO
      ...normalizeStep(s, i),
    })),
  };
}
