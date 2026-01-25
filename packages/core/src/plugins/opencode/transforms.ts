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

interface ClaudeMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "http" | "sse";
  url?: string;
  headers?: Record<string, string>;
}

/**
 * Transform MCP servers from Claude format to OpenCode format.
 *
 * Claude: { command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${DB_URL}" } }
 * OpenCode: { type: "local", command: ["npx", "-y", "@example/db"], environment: { "DB_URL": "{env:DB_URL}" } }
 */
export function transformMcpToOpenCode(
  servers: Record<string, unknown> | undefined
): Record<string, OpenCodeMcpServer> | undefined {
  if (!servers || Object.keys(servers).length === 0) {
    return undefined;
  }

  const result: Record<string, OpenCodeMcpServer> = {};

  for (const [name, serverRaw] of Object.entries(servers)) {
    const server = serverRaw as ClaudeMcpServer;

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
        openCodeServer.environment = transformEnvVars(server.env);
      }
      result[name] = openCodeServer;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform permissions from Claude format to OpenCode format.
 *
 * Claude: { allow: ["Bash(git:*)"], ask: ["Bash(npm:*)"], deny: ["Read(.env)"] }
 * OpenCode: { "bash": { "git *": "allow", "npm *": "ask" }, "read": { ".env": "deny" } }
 */
export function transformPermissionsToOpenCode(
  permissions: { allow?: string[]; ask?: string[]; deny?: string[] } | undefined
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
      const parsed = parsePermissionRule(rule);
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

// --- Helper functions ---

/** Transform ${VAR} or ${VAR:-default} to {env:VAR} */
function transformEnvVar(value: string): string {
  return value.replace(/\$\{([^}:]+)(:-[^}]*)?\}/g, "{env:$1}");
}

function transformEnvVars(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvVar(value);
  }
  return result;
}

/** Parse "Tool(pattern)" format, returns { tool, pattern } or null */
function parsePermissionRule(
  rule: string
): { tool: string; pattern: string } | null {
  const match = rule.match(/^(\w+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }

  const tool = match[1];
  const pattern = match[2];

  if (!tool || !pattern) {
    return null;
  }

  const normalizedTool = tool.toLowerCase();

  // Convert `:*` to ` *` (word boundary)
  let normalizedPattern = pattern;
  if (normalizedPattern.includes(":*")) {
    normalizedPattern = normalizedPattern.replace(/:(\*)/g, " $1");
  }

  return {
    tool: normalizedTool,
    pattern: normalizedPattern,
  };
}
