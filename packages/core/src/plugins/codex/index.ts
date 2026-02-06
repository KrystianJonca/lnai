import { CROSS_TOOL_SKILLS_DIR, TOOL_OUTPUT_DIRS } from "../../constants";
import type {
  McpServer,
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

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.codex;

/**
 * Codex plugin for exporting to .codex/ format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - <dir>/AGENTS.md (generated from .ai/rules/*.md, per glob directory)
 * - .agents/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - .codex/config.toml (generated from settings.mcpServers)
 * - .codex/<path> (symlink -> ../.ai/.codex/<path>) for override files
 */
export const codexPlugin: Plugin = {
  id: "codex",
  name: "Codex",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];

    const agentsSymlink = createRootAgentsMdSymlink(state);
    if (agentsSymlink) {
      files.push(agentsSymlink);
    }

    const rulesMap = groupRulesByDirectory(state.rules);
    for (const [dir, contents] of rulesMap.entries()) {
      if (dir === ".") {
        continue;
      }

      const combinedContent = contents.join("\n---\n\n");
      files.push({
        path: `${dir}/AGENTS.md`,
        type: "text",
        content: combinedContent,
      });
    }

    // Skills go to .agents/skills/ (cross-tool standard path)
    files.push(...createSkillSymlinks(state, CROSS_TOOL_SKILLS_DIR));

    const configToml = buildCodexConfigToml(state.settings?.mcpServers);
    if (configToml) {
      files.push({
        path: `${OUTPUT_DIR}/config.toml`,
        type: "text",
        content: configToml,
      });
    }

    return applyFileOverrides(files, rootDir, "codex");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    if (!state.agents) {
      warnings.push(createNoAgentsMdWarning("root AGENTS.md"));
    }

    const rulesMap = groupRulesByDirectory(state.rules);
    if (rulesMap.has(".")) {
      warnings.push({
        path: ["rules"],
        message:
          "Rules with root globs are not exported - Codex only receives subdirectory AGENTS.md files",
      });
    }

    const mcpServers = state.settings?.mcpServers;
    if (mcpServers) {
      for (const [name, server] of Object.entries(mcpServers)) {
        if (!server.command && !server.url) {
          warnings.push({
            path: ["settings", "mcpServers", name],
            message: `MCP server "${name}" has no command or url - it will be skipped`,
          });
        }
      }
    }

    if (hasPermissionsConfigured(state.settings?.permissions)) {
      skipped.push({
        feature: "permissions",
        reason: "Codex rules are not generated from LNAI permissions",
      });
    }

    return { valid: true, errors: [], warnings, skipped };
  },
};

function buildCodexConfigToml(
  mcpServers: Record<string, McpServer> | undefined
): string | undefined {
  if (!mcpServers || Object.keys(mcpServers).length === 0) {
    return undefined;
  }

  const lines: string[] = [];

  for (const [name, server] of Object.entries(mcpServers)) {
    const hasCommand = !!server.command;
    const hasUrl = !!server.url;

    if (!hasCommand && !hasUrl) {
      continue;
    }

    lines.push(`[mcp_servers.${formatTomlKey(name)}]`);

    if (server.command) {
      lines.push(`command = ${formatTomlString(server.command)}`);
      if (server.args && server.args.length > 0) {
        lines.push(`args = ${formatTomlArray(server.args)}`);
      }
      if (server.env && Object.keys(server.env).length > 0) {
        lines.push(`env = ${formatTomlInlineTable(server.env)}`);
      }
    }

    if (server.url) {
      lines.push(`url = ${formatTomlString(server.url)}`);
      if (server.headers && Object.keys(server.headers).length > 0) {
        lines.push(`http_headers = ${formatTomlInlineTable(server.headers)}`);
      }
    }

    lines.push("");
  }

  if (lines.length === 0) {
    return undefined;
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function formatTomlString(value: string): string {
  return JSON.stringify(value);
}

function formatTomlArray(values: string[]): string {
  return `[${values.map(formatTomlString).join(", ")}]`;
}

function formatTomlKey(key: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(key)) {
    return key;
  }

  return JSON.stringify(key);
}

function formatTomlInlineTable(values: Record<string, string>): string {
  const entries = Object.entries(values).map(
    ([key, value]) => `${formatTomlKey(key)} = ${formatTomlString(value)}`
  );
  return `{ ${entries.join(", ")} }`;
}
