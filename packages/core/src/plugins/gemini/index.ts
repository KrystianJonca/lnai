import { TOOL_OUTPUT_DIRS } from "../../constants";
import type {
  OutputFile,
  SkippedFeatureDetail,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import {
  createNoAgentsMdWarning,
  createRootAgentsMdSymlink,
  createSkillSymlinks,
  hasPermissionsConfigured,
} from "../../utils/agents";
import { applyFileOverrides } from "../../utils/overrides";
import { groupRulesByDirectory } from "../../utils/rules";
import type { Plugin } from "../types";
import { transformMcpToGemini } from "./transforms";

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.gemini;

/**
 * Gemini CLI / Antigravity plugin for exporting to .gemini/ format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - .gemini/settings.json (generated - MCP servers + context.fileName)
 * - .gemini/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .gemini/<overrides> (symlinks from .ai/.gemini/)
 * - <dir>/GEMINI.md (generated from rules per directory)
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

    // AGENTS.md symlink at project root
    const agentsSymlink = createRootAgentsMdSymlink(state);
    if (agentsSymlink) {
      files.push(agentsSymlink);
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

    files.push(...createSkillSymlinks(state, OUTPUT_DIR));

    // Generate settings.json when agents or MCP servers exist
    const mcpServers = transformMcpToGemini(state.settings?.mcpServers);
    const hasAgents = !!state.agents;

    if (mcpServers || hasAgents) {
      const settingsContent: Record<string, unknown> = {};

      if (hasAgents) {
        settingsContent["context"] = { fileName: ["AGENTS.md"] };
      }

      if (mcpServers) {
        settingsContent["mcpServers"] = mcpServers;
      }

      files.push({
        path: `${OUTPUT_DIR}/settings.json`,
        type: "json",
        content: settingsContent,
      });
    }

    return applyFileOverrides(files, rootDir, "gemini");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push(createNoAgentsMdWarning("root AGENTS.md"));
    }

    if (hasPermissionsConfigured(state.settings?.permissions)) {
      skipped.push({
        feature: "permissions",
        reason:
          "Gemini CLI does not support declarative permissions - permissions must be granted interactively",
      });
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
