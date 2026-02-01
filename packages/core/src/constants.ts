export const UNIFIED_DIR = ".ai";

export const TOOL_IDS = [
  "claudeCode",
  "opencode",
  "cursor",
  "copilot",
  "windsurf",
  "gemini",
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

export const TOOL_OUTPUT_DIRS: Record<ToolId, string> = {
  claudeCode: ".claude",
  opencode: ".opencode",
  cursor: ".cursor",
  copilot: ".github",
  windsurf: ".windsurf",
  gemini: ".gemini",
};

/** Tool-specific override directories within .ai/ */
export const OVERRIDE_DIRS: Record<ToolId, string> = {
  claudeCode: ".claude",
  opencode: ".opencode",
  cursor: ".cursor",
  copilot: ".copilot",
  windsurf: ".windsurf",
  gemini: ".gemini",
};
