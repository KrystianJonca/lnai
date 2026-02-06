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
import type { Plugin } from "../types";
import { serializeWindsurfRule, transformRuleToWindsurf } from "./transforms";

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.windsurf;

/**
 * Windsurf IDE plugin for exporting to .windsurf/ format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - .windsurf/rules/<name>.md (generated, transformed from .ai/rules/*.md)
 * - .windsurf/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .windsurf/<path> (symlink -> ../.ai/.windsurf/<path>) for override files
 *
 * Not supported (skipped with warning):
 * - MCP servers (Windsurf uses global config at ~/.codeium/windsurf/mcp_config.json)
 * - Permissions (not supported by Windsurf)
 */
export const windsurfPlugin: Plugin = {
  id: "windsurf",
  name: "Windsurf",

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

    // Generate transformed rules as .md files with Windsurf frontmatter
    for (const rule of state.rules) {
      const transformed = transformRuleToWindsurf(rule);
      const ruleContent = serializeWindsurfRule(
        transformed.frontmatter,
        transformed.content
      );

      files.push({
        path: `${OUTPUT_DIR}/rules/${rule.path}`,
        type: "text",
        content: ruleContent,
      });
    }

    // Create skill symlinks
    files.push(...createSkillSymlinks(state, OUTPUT_DIR));

    return applyFileOverrides(files, rootDir, "windsurf");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push(createNoAgentsMdWarning("root AGENTS.md"));
    }

    // Warn about manual rule invocation
    if (state.rules.length > 0) {
      warnings.push({
        path: [".windsurf/rules"],
        message:
          "Rules are exported with 'trigger: manual' and require explicit @mention to invoke",
      });
    }

    // Warn about MCP servers (not supported - global config)
    if (
      state.settings?.mcpServers &&
      Object.keys(state.settings.mcpServers).length > 0
    ) {
      skipped.push({
        feature: "mcpServers",
        reason:
          "Windsurf uses global MCP config at ~/.codeium/windsurf/mcp_config.json - project-level MCP servers are not exported",
      });
    }

    // Warn about permissions (not supported)
    if (hasPermissionsConfigured(state.settings?.permissions)) {
      skipped.push({
        feature: "permissions",
        reason: "Windsurf does not support declarative permissions",
      });
    }

    return { valid: true, errors: [], warnings, skipped };
  },
};
