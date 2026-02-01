import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  Permissions,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";
import {
  serializeCursorRule,
  transformMcpToCursor,
  transformPermissionsToCursor,
  transformRuleToCursor,
} from "./transforms";

/**
 * Cursor IDE plugin for exporting to .cursor/ format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - .cursor/rules/<name>.mdc (generated, transformed from .ai/rules/*.md)
 * - .cursor/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .cursor/mcp.json (generated from settings.mcpServers)
 * - .cursor/<path> (symlink -> ../.ai/.cursor/<path>) for override files
 */
export const cursorPlugin: Plugin = {
  id: "cursor",
  name: "Cursor",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];
    const outputDir = TOOL_OUTPUT_DIRS.cursor;

    // AGENTS.md symlink at project root
    if (state.agents) {
      files.push({
        path: "AGENTS.md",
        type: "symlink",
        target: `${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    // Generate transformed rules as .mdc files
    for (const rule of state.rules) {
      const transformed = transformRuleToCursor(rule);
      const ruleContent = serializeCursorRule(
        transformed.frontmatter,
        transformed.content
      );

      // Change extension from .md to .mdc
      const outputFilename = rule.path.replace(/\.md$/, ".mdc");

      files.push({
        path: `${outputDir}/rules/${outputFilename}`,
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

    // Generate mcp.json if MCP servers exist
    const mcpServers = transformMcpToCursor(state.settings?.mcpServers);

    if (mcpServers) {
      files.push({
        path: `${outputDir}/mcp.json`,
        type: "json",
        content: { mcpServers },
      });
    }

    // Generate cli.json if permissions exist
    const cliContent = buildCliContent(state.settings?.permissions);
    if (cliContent) {
      files.push({
        path: `${outputDir}/cli.json`,
        type: "json",
        content: cliContent,
      });
    }

    return applyFileOverrides(files, rootDir, "cursor");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];

    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - root AGENTS.md will not be created",
      });
    }

    // Check if "ask" permissions are used (not supported by Cursor)
    const permissionsResult = transformPermissionsToCursor(
      state.settings?.permissions
    );
    if (permissionsResult.hasAskPermissions) {
      warnings.push({
        path: ["settings", "permissions", "ask"],
        message:
          'Cursor does not support "ask" permission level - these rules will be treated as "allow"',
      });
    }

    // Check for invalid MCP servers that will be skipped
    const mcpServers = state.settings?.mcpServers;
    if (mcpServers) {
      for (const [name, server] of Object.entries(mcpServers)) {
        const isRemote = server.type === "http" || server.type === "sse";
        const hasCommand = !!server.command;
        if (!isRemote && !hasCommand) {
          warnings.push({
            path: ["settings", "mcpServers", name],
            message: `MCP server "${name}" has no command or type - it will be skipped`,
          });
        }
      }
    }

    return { valid: true, errors: [], warnings, skipped: [] };
  },
};

/**
 * Build CLI config content from permissions.
 * Returns undefined if there's no content to generate.
 */
function buildCliContent(
  permissions: Permissions | undefined
): Record<string, unknown> | undefined {
  const permissionsResult = transformPermissionsToCursor(permissions);

  if (!permissionsResult.permissions) {
    return undefined;
  }

  return { permissions: permissionsResult.permissions };
}
