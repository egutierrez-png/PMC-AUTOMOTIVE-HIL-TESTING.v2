import { useEffect, useMemo, useState } from "react";
import { Panel } from "./Panel";
import ValueReadingsPanel, {
type ValueReadingItem,
} from "./results/ValueReadingsPanel";
import { useRuntimeStore } from "../state/useRuntimeStore";
import type { TestResultPayload } from "../types/TestResult";
import type { RecipeDoc } from "../types/Recipe";
import ChecksumSummaryPanel from "./results/ChecksumSummaryPanel";
import MechanicalResultsPanel, {
  type MechanicalResultItem,
} from "./results/MechanicalResultsPanel";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickLimitFromRecipeLimits(
  limits: Record<string, any> | undefined,
  index: number,
  keys: string[]
): number | null {
  if (!limits) return null;

  for (const key of keys) {
    const raw = limits[key];
    if (Array.isArray(raw)) {
      const item = raw[index];
      const n = toNumber(item);
      if (n !== null) return n;
      continue;
    }

    const n = toNumber(raw);
    if (n !== null) return n;
  }

  return null;
}

function resolveResultStep(_result: any, fallbackIndex: number) {
  // Ver ResultsPanel.tsx: el campo "step" del PMC no es confiable en Auto.
  return fallbackIndex + 1;
}

function getStepLimits(recipe: RecipeDoc | null, stepIndex: number): {
  lowerLimit: number | null;
  upperLimit: number | null;
} {
  const step = recipe?.sequence?.[stepIndex];

  const lowerFromStep = toNumber(step?.expect?.final_position_greater_than);
  const upperFromStep = toNumber(step?.expect?.final_position_less_than);

  const lowerFromRecipe = pickLimitFromRecipeLimits(recipe?.limits, stepIndex, [
    "position_lower_limit",
    "position_min",
    "measured_position_min",
    "lower_limit",
  ]);

  const upperFromRecipe = pickLimitFromRecipeLimits(recipe?.limits, stepIndex, [
    "position_upper_limit",
    "position_max",
    "measured_position_max",
    "upper_limit",
  ]);

  return {
    lowerLimit: lowerFromStep ?? lowerFromRecipe,
    upperLimit: upperFromStep ?? upperFromRecipe,
  };
}

export default function OperatorQualityPanel() {
  const runtimeResults = useRuntimeStore((s) => s.results) as
    | TestResultPayload
    | null
    | undefined;
  const selectedRecipe = useRuntimeStore((s) => s.selectedRecipe);
  const operationMode = useRuntimeStore((s) => s.mode);

  // Keep the last valid piece result visible until a new piece result arrives.
  const [latchedResults, setLatchedResults] = useState<TestResultPayload | null>(null);

  useEffect(() => {
    if (!runtimeResults) return;
    if (!Array.isArray(runtimeResults.results) || runtimeResults.results.length === 0) {
      return;
    }

    setLatchedResults(runtimeResults);
  }, [runtimeResults]);

  const activeResults = latchedResults;

  const listToRender = activeResults?.results ?? [];

  const checksumValue =
    activeResults?.checksum ?? (activeResults as any)?.checksum_value ?? null;
  const checksumOk =
    activeResults?.checksum_ok ?? (activeResults as any)?.checksum_valid ?? null;

  const failsafeRaw =
    activeResults?.failsafe_result ?? (activeResults as any)?.failsafe ?? null;
  const failsafeOk =
    activeResults?.failsafe_ok ?? (activeResults as any)?.failsafe_ok ?? null;

  const failsafeLabel =
    typeof failsafeRaw === "string"
      ? failsafeRaw
      : typeof failsafeRaw === "boolean"
      ? failsafeRaw
        ? "Activo"
        : "Inactivo"
      : null;

  const mechanicalItems: MechanicalResultItem[] = useMemo(() => {
    return listToRender.map((result: any, idx: number) => {
      const stepIndexRaw = toNumber(result?.step);
      const resolvedStep = resolveResultStep(result, idx);
      const stepIndex =
        operationMode === "auto"
          ? Math.max(resolvedStep - 1, 0)
          : stepIndexRaw !== null
          ? Math.max(stepIndexRaw - 1, 0)
          : idx;
      const measuredPosition = toNumber(result?.measured_position);

      const { lowerLimit, upperLimit } = getStepLimits(selectedRecipe, stepIndex);

      let inRange: boolean | null = null;
      if (measuredPosition !== null) {
        const lowerOk = lowerLimit === null ? true : measuredPosition >= lowerLimit;
        const upperOk = upperLimit === null ? true : measuredPosition <= upperLimit;
        inRange = lowerOk && upperOk;
      }

      return {
        stepLabel: `Paso ${stepIndex + 1}`,
        measuredPosition,
        lowerLimit,
        upperLimit,
        inRange,
      };
    });
  }, [listToRender, operationMode, selectedRecipe]);

const valueReadings: ValueReadingItem[] = useMemo(() => {
  return listToRender
    .filter((r: any) => r?.value_text !== undefined && r?.value_text !== null)
    .map((r: any) => ({
      label: r.value_name ?? r.message ?? "Lectura",
      valueText: String(r.value_text),
      ok: r.status === "PASS" ? true : r.status === "FAIL" ? false : null,
    }));
}, [listToRender]);

 return (
    <Panel title="Control de calidad actual">
      <ChecksumSummaryPanel
        checksumValue={checksumValue}
        checksumOk={checksumOk}
        failsafeLabel={failsafeLabel || undefined}
        failsafeOk={failsafeOk}
      />

      <MechanicalResultsPanel items={mechanicalItems} />

      <ValueReadingsPanel items={valueReadings} />
    </Panel>
  );
}
