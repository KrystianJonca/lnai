import * as path from "node:path";

/**
 * Extracts the base directory from a glob pattern.
 * E.g. "apps/cli/**\/*.ts" -> "apps/cli"
 */
export function getDirFromGlob(glob: string): string {
  const cleanPath = glob.replace(/(\*\*|\*|\{.*,.*\}).*$/, "");
  const dir = cleanPath.replace(/\/$/, "");

  if (dir === glob) {
    const dirname = path.dirname(dir);
    return dirname === "." && !dir.includes("/") ? "." : dirname;
  }

  if (!dir) {
    return ".";
  }

  return dir;
}
