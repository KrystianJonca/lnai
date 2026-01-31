import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  SkippedFeatureDetail,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";
import { serializeWindsurfRule, transformRuleToWindsurf } from "./transforms";

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
    const outputDir = TOOL_OUTPUT_DIRS.windsurf;

    // AGENTS.md symlink at project root
    if (state.agents) {
      files.push({
        path: "AGENTS.md",
        type: "symlink",
        target: `${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    // Generate transformed rules as .md files with Windsurf frontmatter
    for (const rule of state.rules) {
      const transformed = transformRuleToWindsurf(rule);
      const ruleContent = serializeWindsurfRule(
        transformed.frontmatter,
        transformed.content
      );

      files.push({
        path: `${outputDir}/rules/${rule.path}`,
        type: "text",
        content: ruleContent,
      });
    }

    // Create skill symlinks
    for (const skill of state.skills) {
      files.push({
        path: `${outputDir}/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    return applyFileOverrides(files, rootDir, "windsurf");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - root AGENTS.md will not be created",
      });
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
    if (state.settings?.permissions) {
      const hasPermissions =
        (state.settings.permissions.allow?.length ?? 0) > 0 ||
        (state.settings.permissions.ask?.length ?? 0) > 0 ||
        (state.settings.permissions.deny?.length ?? 0) > 0;

      if (hasPermissions) {
        skipped.push({
          feature: "permissions",
          reason: "Windsurf does not support declarative permissions",
        });
      }
    }

    return { valid: true, errors: [], warnings, skipped };
  },
};
