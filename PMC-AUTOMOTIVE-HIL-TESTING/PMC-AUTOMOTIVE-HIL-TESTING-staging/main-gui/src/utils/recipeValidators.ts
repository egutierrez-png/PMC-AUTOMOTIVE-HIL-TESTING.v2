export function isInternalRecipe(raw: any): boolean {
  return (
    typeof raw === "object" &&
    typeof raw.schema === "string" &&
    raw.schema.startsWith("pmc.recipe") &&
    Array.isArray(raw.sequence)
  );
}

export function isExternalRecipe(raw: any): boolean {
  return (
    typeof raw === "object" &&
    typeof raw.job_id === "string" &&
    Array.isArray(raw.sequence) &&
    raw.sequence.length > 0 &&
    raw.sequence.every((s: any) => typeof s.action === "string")
  );
}
