export const UNIFIED_DIR = ".ai";

export const TOOL_IDS = [
  "claudeCode",
  "opencode",
  "cursor",
  "copilot",
  "windsurf",
  "gemini",
  "codex",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const CONFIG_FILES = {
  config: "config.json",
  settings: "settings.json",
  agents: "AGENTS.md",
} as const;

export const CONFIG_DIRS = {
  rules: "rules",
  skills: "skills",
  subagents: "subagents",
} as const;

export const CROSS_TOOL_SKILLS_DIR = ".agents";

export const TOOL_OUTPUT_DIRS: Record<ToolId, string> = {
  claudeCode: ".claude",
  opencode: ".opencode",
  cursor: ".cursor",
  copilot: ".github",
  windsurf: ".windsurf",
  gemini: ".gemini",
  codex: ".codex",
};

/**
 * Tool-specific override directories within .ai/
 *
 * Note: Copilot uses .copilot for overrides (not .github) to avoid
 * conflicts with other GitHub files in the .github directory (workflows,
 * issue templates, etc.). This keeps LNAI overrides clearly namespaced.
 */
export const OVERRIDE_DIRS: Record<ToolId, string> = {
  claudeCode: ".claude",
  opencode: ".opencode",
  cursor: ".cursor",
  copilot: ".copilot",
  windsurf: ".windsurf",
  gemini: ".gemini",
  codex: ".codex",
};
