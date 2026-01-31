/**
 * Shared transform utilities for LNAI plugins.
 *
 * This module consolidates common transformation functions that are used
 * across multiple plugins (cursor, copilot, opencode).
 */

const ENV_VAR_PATTERN = /\$\{([^}:]+)(:-[^}]*)?\}/g;

export type EnvVarFormat = "cursor" | "copilot" | "opencode";

/**
 * Transform a single environment variable reference to the target format.
 *
 * Input formats supported:
 * - ${VAR} - Simple variable reference
 * - ${VAR:-default} - Variable with default value (default is stripped)
 *
 * Output formats:
 * - cursor/copilot: ${env:VAR}
 * - opencode: {env:VAR}
 */
export function transformEnvVar(value: string, format: EnvVarFormat): string {
  if (format === "opencode") {
    return value.replace(ENV_VAR_PATTERN, "{env:$1}");
  }
  // cursor and copilot use the same format
  return value.replace(ENV_VAR_PATTERN, "${env:$1}");
}

/**
 * Transform all environment variable references in a record.
 */
export function transformEnvVars(
  env: Record<string, string>,
  format: EnvVarFormat
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvVar(value, format);
  }
  return result;
}

/**
 * Parse a permission rule in "Tool(pattern)" format.
 *
 * @returns Parsed tool and pattern, or null if invalid format
 */
export function parsePermissionRule(
  rule: string
): { tool: string; pattern: string } | null {
  const match = rule.match(/^(\w+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }

  const tool = match[1];
  const pattern = match[2];

  if (!tool || !pattern) {
    return null;
  }

  return { tool, pattern };
}

/**
 * Derive a description from the first H1 heading or filename.
 *
 * Used by cursor and copilot plugins to generate rule descriptions.
 */
export function deriveDescription(filename: string, content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1];
  }

  const baseName = filename.replace(/\.md$/, "");
  return baseName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
