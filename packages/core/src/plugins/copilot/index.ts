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
import { validateMcpServers } from "../../utils/mcp";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";
import {
  serializeCopilotInstruction,
  transformMcpToCopilot,
  transformRuleToCopilot,
} from "./transforms";

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.copilot;

/**
 * GitHub Copilot plugin for exporting to .github/ and .vscode/ formats
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
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

    // AGENTS.md symlink at project root
    const agentsSymlink = createRootAgentsMdSymlink(state);
    if (agentsSymlink) {
      files.push(agentsSymlink);
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
        path: `${OUTPUT_DIR}/instructions/${outputFilename}`,
        type: "text",
        content: ruleContent,
      });
    }

    // Create skill symlinks
    files.push(...createSkillSymlinks(state, OUTPUT_DIR));

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
      warnings.push(createNoAgentsMdWarning("root AGENTS.md"));
    }

    // Check if permissions are configured (not supported by Copilot)
    if (hasPermissionsConfigured(state.settings?.permissions)) {
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
