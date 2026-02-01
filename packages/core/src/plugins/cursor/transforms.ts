import type {
  MarkdownFile,
  McpServer,
  Permissions,
  RuleFrontmatter,
} from "../../types/index";
import { deriveDescription, transformEnvVars } from "../../utils/transforms";
import type {
  CursorMcpServer,
  CursorRuleFrontmatter,
  TransformPermissionsResult,
} from "./types";

export type {
  CursorPermissions,
  CursorRuleFrontmatter,
  TransformPermissionsResult,
} from "./types";

/**
 * Transform LNAI rule to Cursor rule format.
 *
 * LNAI: { paths: ["**\/*.ts"] }
 * Cursor: { description: "...", globs: ["**\/*.ts"], alwaysApply: false }
 */
export function transformRuleToCursor(rule: MarkdownFile<RuleFrontmatter>): {
  frontmatter: CursorRuleFrontmatter;
  content: string;
} {
  const description = deriveDescription(rule.path, rule.content);
  const globs = rule.frontmatter.paths || [];
  const alwaysApply = globs.length === 0;

  return {
    frontmatter: {
      description,
      globs,
      alwaysApply,
    },
    content: rule.content,
  };
}

/**
 * Serialize rule to .mdc format with YAML frontmatter.
 */
export function serializeCursorRule(
  frontmatter: CursorRuleFrontmatter,
  content: string
): string {
  const lines = [
    "---",
    `description: ${JSON.stringify(frontmatter.description)}`,
  ];

  lines.push("globs:");
  for (const glob of frontmatter.globs) {
    lines.push(`  - ${JSON.stringify(glob)}`);
  }

  lines.push(`alwaysApply: ${frontmatter.alwaysApply}`);
  lines.push("---");
  lines.push("");
  lines.push(content);

  return lines.join("\n");
}

/**
 * Transform MCP servers from LNAI format to Cursor format.
 *
 * LNAI: { command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${DB_URL}" } }
 * Cursor: { command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${env:DB_URL}" } }
 *
 * LNAI HTTP: { type: "http", url: "...", headers: { ... } }
 * Cursor: { url: "...", headers: { ... } }
 */
export function transformMcpToCursor(
  servers: Record<string, McpServer> | undefined
): Record<string, CursorMcpServer> | undefined {
  if (!servers || Object.keys(servers).length === 0) {
    return undefined;
  }

  const result: Record<string, CursorMcpServer> = {};

  for (const [name, server] of Object.entries(servers)) {
    if (server.type === "http" || server.type === "sse") {
      const cursorServer: CursorMcpServer = {
        url: server.url,
      };
      if (server.headers) {
        cursorServer.headers = transformEnvVars(server.headers, "cursor");
      }
      result[name] = cursorServer;
    } else if (server.command) {
      const cursorServer: CursorMcpServer = {
        command: server.command,
      };
      if (server.args && server.args.length > 0) {
        cursorServer.args = server.args;
      }
      if (server.env) {
        cursorServer.env = transformEnvVars(server.env, "cursor");
      }
      result[name] = cursorServer;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform permissions from LNAI format to Cursor format.
 *
 * LNAI: { allow: ["Bash(git:*)"], ask: ["Bash(npm:*)"], deny: ["Read(.env)"] }
 * Cursor: { allow: ["Shell(git)"], deny: ["Read(.env)"] }
 *
 * Key differences:
 * - Cursor uses Shell() instead of Bash()
 * - Cursor doesn't have "ask" level - these are mapped to "allow"
 * - Pattern format: "git:*" becomes "git" (just the command base)
 */
export function transformPermissionsToCursor(
  permissions: Permissions | undefined
): TransformPermissionsResult {
  if (!permissions) {
    return { permissions: undefined, hasAskPermissions: false };
  }

  const allow: string[] = [];
  const deny: string[] = [];
  let hasAskPermissions = false;

  if (permissions.allow) {
    for (const rule of permissions.allow) {
      const transformed = transformPermissionRule(rule);
      if (transformed) {
        allow.push(transformed);
      }
    }
  }

  if (permissions.ask && permissions.ask.length > 0) {
    hasAskPermissions = true;
    for (const rule of permissions.ask) {
      const transformed = transformPermissionRule(rule);
      if (transformed) {
        allow.push(transformed);
      }
    }
  }

  if (permissions.deny) {
    for (const rule of permissions.deny) {
      const transformed = transformPermissionRule(rule);
      if (transformed) {
        deny.push(transformed);
      }
    }
  }

  if (allow.length === 0 && deny.length === 0) {
    return { permissions: undefined, hasAskPermissions };
  }

  return {
    permissions: {
      allow,
      deny,
    },
    hasAskPermissions,
  };
}

/**
 * Transform a single permission rule to Cursor format.
 *
 * "Bash(git:*)" -> "Shell(git)"
 * "Read(.env)" -> "Read(.env)"
 * "Write(src/*)" -> "Write(src/*)"
 */
export function transformPermissionRule(rule: string): string | null {
  const match = rule.match(/^(\w+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }

  const tool = match[1]!;
  let pattern = match[2]!;

  const cursorTool = tool.toLowerCase() === "bash" ? "Shell" : tool;

  if (pattern.endsWith(":*")) {
    pattern = pattern.slice(0, -2);
  }

  return `${cursorTool}(${pattern})`;
}
