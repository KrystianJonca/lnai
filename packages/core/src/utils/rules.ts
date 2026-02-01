import * as path from "node:path";

import type { MarkdownFile, RuleFrontmatter } from "../types/index";

/**
 * Extracts the base directory from a glob pattern.
 * E.g. "apps/cli/**\\/*.ts" -> "apps/cli"
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

export function groupRulesByDirectory(
  rules: MarkdownFile<RuleFrontmatter>[]
): Map<string, string[]> {
  const rulesMap = new Map<string, string[]>();
  const addedRules = new Map<string, Set<string>>(); // dir -> set of rule paths

  for (const rule of rules) {
    for (const pathGlob of rule.frontmatter.paths) {
      const dir = getDirFromGlob(pathGlob);

      if (!rulesMap.has(dir)) {
        rulesMap.set(dir, []);
        addedRules.set(dir, new Set());
      }

      // Skip if this rule was already added to this directory
      if (addedRules.get(dir)?.has(rule.path)) {
        continue;
      }

      addedRules.get(dir)?.add(rule.path);
      const content = `## ${rule.path}\n\n${rule.content}\n`;
      rulesMap.get(dir)?.push(content);
    }
  }

  return rulesMap;
}
