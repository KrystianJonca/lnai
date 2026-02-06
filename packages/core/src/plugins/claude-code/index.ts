import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import {
  createNoAgentsMdWarning,
  createSkillSymlinks,
} from "../../utils/agents";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.claudeCode;

/**
 * Claude Code plugin for exporting to .claude/ format
 *
 * Output structure:
 * - .claude/CLAUDE.md (symlink -> ../.ai/AGENTS.md)
 * - .claude/rules/ (symlink -> ../.ai/rules)
 * - .claude/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .claude/settings.json (generated settings merged with .ai/.claude/settings.json)
 * - .claude/<path> (symlink -> ../.ai/.claude/<path>) for other override files
 */
export const claudeCodePlugin: Plugin = {
  id: "claudeCode",
  name: "Claude Code",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];

    if (state.agents) {
      files.push({
        path: `${OUTPUT_DIR}/CLAUDE.md`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    if (state.rules.length > 0) {
      files.push({
        path: `${OUTPUT_DIR}/rules`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/rules`,
      });
    }

    files.push(...createSkillSymlinks(state, OUTPUT_DIR));

    const settings: Record<string, unknown> = {};
    if (state.settings?.permissions) {
      settings["permissions"] = state.settings.permissions;
    }
    if (state.settings?.mcpServers) {
      settings["mcpServers"] = state.settings.mcpServers;
    }

    if (Object.keys(settings).length > 0) {
      files.push({
        path: `${OUTPUT_DIR}/settings.json`,
        type: "json",
        content: settings,
      });
    }

    return applyFileOverrides(files, rootDir, "claudeCode");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    if (!state.agents) {
      warnings.push(createNoAgentsMdWarning(".claude/CLAUDE.md"));
    }
    return { valid: true, errors: [], warnings, skipped: [] };
  },
};
