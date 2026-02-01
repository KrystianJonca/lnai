import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  SkippedFeatureDetail,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import { applyFileOverrides } from "../../utils/overrides";
import { groupRulesByDirectory } from "../../utils/rules";
import type { Plugin } from "../types";
import { transformMcpToGemini } from "./transforms";

/**
 * Gemini CLI / Antigravity plugin for exporting to .gemini/ format
 */
export const geminiPlugin: Plugin = {
  id: "gemini",
  name: "Gemini CLI",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];
    const outputDir = TOOL_OUTPUT_DIRS.gemini;

    if (state.agents) {
      files.push({
        path: `${outputDir}/GEMINI.md`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    const rulesMap = groupRulesByDirectory(state.rules);
    for (const [dir, contents] of rulesMap.entries()) {
      const combinedContent = contents.join("\n---\n\n");
      const filePath = dir === "." ? "GEMINI.md" : `${dir}/GEMINI.md`;

      files.push({
        path: filePath,
        type: "text",
        content: combinedContent,
      });
    }

    for (const skill of state.skills) {
      files.push({
        path: `${outputDir}/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    const mcpServers = transformMcpToGemini(state.settings?.mcpServers);
    if (mcpServers) {
      files.push({
        path: `${outputDir}/settings.json`,
        type: "json",
        content: { mcpServers },
      });
    }

    return applyFileOverrides(files, rootDir, "gemini");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - GEMINI.md will not be created",
      });
    }

    if (state.settings?.permissions) {
      const hasPermissions =
        (state.settings.permissions.allow?.length ?? 0) > 0 ||
        (state.settings.permissions.ask?.length ?? 0) > 0 ||
        (state.settings.permissions.deny?.length ?? 0) > 0;

      if (hasPermissions) {
        skipped.push({
          feature: "permissions",
          reason:
            "Gemini CLI does not support declarative permissions - permissions must be granted interactively",
        });
      }
    }

    if (state.rules.length > 0) {
      warnings.push({
        path: ["rules"],
        message:
          "Rules will be generated into GEMINI.md files in their respective subdirectories (e.g. apps/cli/GEMINI.md).",
      });
    }

    return { valid: true, errors: [], warnings, skipped };
  },
};
