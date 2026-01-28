import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  UnifiedState,
  ValidationResult,
} from "../../types/index";
import {
  deepMergeConfigs,
  getOverrideOutputFiles,
} from "../../utils/overrides";
import type { Plugin } from "../types";

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
    const outputDir = TOOL_OUTPUT_DIRS.claudeCode;

    if (state.agents) {
      files.push({
        path: `${outputDir}/CLAUDE.md`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    if (state.rules.length > 0) {
      files.push({
        path: `${outputDir}/rules`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/rules`,
      });
    }

    for (const skill of state.skills) {
      files.push({
        path: `${outputDir}/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    const baseSettings: Record<string, unknown> = {};
    if (state.settings?.permissions) {
      baseSettings["permissions"] = state.settings.permissions;
    }
    if (state.settings?.mcpServers) {
      baseSettings["mcpServers"] = state.settings.mcpServers;
    }

    let finalSettings = baseSettings;
    if (state.settings?.overrides?.claudeCode) {
      finalSettings = deepMergeConfigs(
        baseSettings,
        state.settings.overrides.claudeCode
      );
    }

    if (Object.keys(finalSettings).length > 0) {
      files.push({
        path: `${outputDir}/settings.json`,
        type: "json",
        content: finalSettings,
      });
    }

    const overrideFiles = await getOverrideOutputFiles(rootDir, "claudeCode");
    files.push(...overrideFiles);

    return files;
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: { path: string[]; message: string }[] = [];
    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - .claude/CLAUDE.md will not be created",
      });
    }
    return { valid: true, errors: [], warnings, skipped: [] };
  },
};
