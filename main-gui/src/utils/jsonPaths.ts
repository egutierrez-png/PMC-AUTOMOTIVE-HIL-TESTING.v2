export function extractPaths(obj: any, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [];

  let paths: string[] = [];

  if (typeof obj !== "object") {
    paths.push(prefix);
    return paths;
  }

  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    paths = paths.concat(extractPaths(obj[key], newPrefix));
  }

  return paths;
}
