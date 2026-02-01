import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  McpServer,
  OutputFile,
  SkippedFeatureDetail,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import { applyFileOverrides } from "../../utils/overrides";
import { groupRulesByDirectory } from "../../utils/rules";
import type { Plugin } from "../types";

/**
 * Codex plugin for exporting to .codex/ format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - <dir>/AGENTS.md (generated from .ai/rules/*.md, per glob directory)
 * - .codex/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
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
    const outputDir = TOOL_OUTPUT_DIRS.codex;

    if (state.agents) {
      files.push({
        path: "AGENTS.md",
        type: "symlink",
        target: `${UNIFIED_DIR}/AGENTS.md`,
      });
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

    for (const skill of state.skills) {
      files.push({
        path: `${outputDir}/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    const configToml = buildCodexConfigToml(state.settings?.mcpServers);
    if (configToml) {
      files.push({
        path: `${outputDir}/config.toml`,
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
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - root AGENTS.md will not be created",
      });
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

    if (state.settings?.permissions) {
      const hasPermissions =
        (state.settings.permissions.allow?.length ?? 0) > 0 ||
        (state.settings.permissions.ask?.length ?? 0) > 0 ||
        (state.settings.permissions.deny?.length ?? 0) > 0;

      if (hasPermissions) {
        skipped.push({
          feature: "permissions",
          reason: "Codex rules are not generated from LNAI permissions",
        });
      }
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
