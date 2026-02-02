import { UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  SkippedFeatureDetail,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import { validateMcpServers } from "../../utils/mcp";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";
import {
  serializeCopilotInstruction,
  transformMcpToCopilot,
  transformRuleToCopilot,
} from "./transforms";

/**
 * GitHub Copilot plugin for exporting to .github/ and .vscode/ formats
 *
 * Output structure:
 * - .github/copilot-instructions.md (symlink -> ../.ai/AGENTS.md)
 * - .github/instructions/<name>.instructions.md (generated from .ai/rules/*.md)
 * - .github/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .vscode/mcp.json (generated from settings.mcpServers)
 * - .github/<path> (symlink -> ../.ai/.copilot/<path>) for override files
 */
export const copilotPlugin: Plugin = {
  id: "copilot",
  name: "GitHub Copilot",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];

    // AGENTS.md symlink at .github/copilot-instructions.md
    if (state.agents) {
      files.push({
        path: ".github/copilot-instructions.md",
        type: "symlink",
        target: `../${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    // Generate transformed rules as .instructions.md files
    for (const rule of state.rules) {
      const transformed = transformRuleToCopilot(rule);
      const ruleContent = serializeCopilotInstruction(
        transformed.frontmatter,
        transformed.content
      );

      // Change extension from .md to .instructions.md
      const outputFilename = rule.path.replace(/\.md$/, ".instructions.md");

      files.push({
        path: `.github/instructions/${outputFilename}`,
        type: "text",
        content: ruleContent,
      });
    }

    // Create skill symlinks to .github/skills/
    for (const skill of state.skills) {
      files.push({
        path: `.github/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    // Generate .vscode/mcp.json if MCP servers exist
    const mcpConfig = transformMcpToCopilot(state.settings?.mcpServers);

    if (mcpConfig) {
      files.push({
        path: ".vscode/mcp.json",
        type: "json",
        content: { inputs: mcpConfig.inputs, servers: mcpConfig.servers },
      });
    }

    return applyFileOverrides(files, rootDir, "copilot");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message:
          "No AGENTS.md found - .github/copilot-instructions.md will not be created",
      });
    }

    // Check if permissions are configured (not supported by Copilot)
    const permissions = state.settings?.permissions;
    const hasPermissions =
      permissions &&
      ((permissions.allow && permissions.allow.length > 0) ||
        (permissions.ask && permissions.ask.length > 0) ||
        (permissions.deny && permissions.deny.length > 0));

    if (hasPermissions) {
      skipped.push({
        feature: "permissions",
        reason: "GitHub Copilot does not support declarative permissions",
      });
    }

    // Check for invalid MCP servers that will be skipped
    warnings.push(
      ...validateMcpServers(state.settings?.mcpServers, [
        "settings",
        "mcpServers",
      ])
    );

    return { valid: true, errors: [], warnings, skipped };
  },
};
