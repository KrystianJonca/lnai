import type { McpServer, Permissions } from "../../types/index";
import {
  parsePermissionRule as parseRule,
  transformEnvVars,
} from "../../utils/transforms";

/** OpenCode-specific MCP server output format */
interface OpenCodeMcpServer {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
}

type OpenCodePermission = Record<
  string,
  Record<string, "allow" | "ask" | "deny">
>;

/**
 * Transform MCP servers from LNAI format to OpenCode format.
 *
 * LNAI: { command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${DB_URL}" } }
 * OpenCode: { type: "local", command: ["npx", "-y", "@example/db"], environment: { "DB_URL": "{env:DB_URL}" } }
 */
export function transformMcpToOpenCode(
  servers: Record<string, McpServer> | undefined
): Record<string, OpenCodeMcpServer> | undefined {
  if (!servers || Object.keys(servers).length === 0) {
    return undefined;
  }

  const result: Record<string, OpenCodeMcpServer> = {};

  for (const [name, server] of Object.entries(servers)) {

    if (server.type === "http" || server.type === "sse") {
      const openCodeServer: OpenCodeMcpServer = {
        type: "remote",
        url: server.url,
      };
      if (server.headers) {
        openCodeServer.headers = server.headers;
      }
      result[name] = openCodeServer;
    } else if (server.command) {
      const command = [server.command, ...(server.args || [])];
      const openCodeServer: OpenCodeMcpServer = {
        type: "local",
        command,
      };
      if (server.env) {
        openCodeServer.environment = transformEnvVars(server.env, "opencode");
      }
      result[name] = openCodeServer;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform permissions from LNAI format to OpenCode format.
 *
 * LNAI: { allow: ["Bash(git:*)"], ask: ["Bash(npm:*)"], deny: ["Read(.env)"] }
 * OpenCode: { "bash": { "git *": "allow", "npm *": "ask" }, "read": { ".env": "deny" } }
 */
export function transformPermissionsToOpenCode(
  permissions: Permissions | undefined
): OpenCodePermission | undefined {
  if (!permissions) {
    return undefined;
  }

  const result: OpenCodePermission = {};

  const processRules = (
    rules: string[] | undefined,
    level: "allow" | "ask" | "deny"
  ) => {
    if (!rules) {
      return;
    }

    for (const rule of rules) {
      const parsed = parsePermissionRuleForOpenCode(rule);
      if (!parsed) {
        continue;
      }

      const { tool, pattern } = parsed;
      if (!result[tool]) {
        result[tool] = {};
      }

      result[tool]![pattern] = level;
    }
  };

  // Process in priority order: allow first, then ask, then deny (highest priority overwrites)
  processRules(permissions.allow, "allow");
  processRules(permissions.ask, "ask");
  processRules(permissions.deny, "deny");

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Parse and normalize a permission rule for OpenCode format.
 * Uses shared parsing, then applies OpenCode-specific normalization:
 * - Tool names are lowercased
 * - `:*` patterns are converted to ` *` (word boundary)
 */
function parsePermissionRuleForOpenCode(
  rule: string
): { tool: string; pattern: string } | null {
  const parsed = parseRule(rule);
  if (!parsed) {
    return null;
  }

  const normalizedTool = parsed.tool.toLowerCase();

  // Convert `:*` to ` *` (word boundary)
  let normalizedPattern = parsed.pattern;
  if (normalizedPattern.includes(":*")) {
    normalizedPattern = normalizedPattern.replace(/:(\*)/g, " $1");
  }

  return {
    tool: normalizedTool,
    pattern: normalizedPattern,
  };
}
