import type {
  MarkdownFile,
  McpServer,
  RuleFrontmatter,
} from "../../types/index";

// Re-export deriveDescription from cursor transforms for reuse
export { deriveDescription } from "../cursor/transforms";
import { deriveDescription } from "../cursor/transforms";

export interface CopilotRuleFrontmatter {
  applyTo?: string;
  description: string;
}

/**
 * Transform LNAI rule to Copilot instruction format.
 *
 * LNAI: { paths: ["**\/*.ts", "**\/*.tsx"] }
 * Copilot: { applyTo: "**\/*.ts,**\/*.tsx", description: "..." }
 */
export function transformRuleToCopilot(
  rule: MarkdownFile<RuleFrontmatter>
): { frontmatter: CopilotRuleFrontmatter; content: string } {
  const description = deriveDescription(rule.path, rule.content);
  const paths = rule.frontmatter.paths || [];

  const frontmatter: CopilotRuleFrontmatter = {
    description,
  };

  // Only set applyTo if paths exist (comma-separated)
  if (paths.length > 0) {
    frontmatter.applyTo = paths.join(",");
  }

  return {
    frontmatter,
    content: rule.content,
  };
}

/**
 * Serialize rule to .instructions.md format with YAML frontmatter.
 */
export function serializeCopilotInstruction(
  frontmatter: CopilotRuleFrontmatter,
  content: string
): string {
  const lines = ["---"];

  if (frontmatter.applyTo) {
    lines.push(`applyTo: ${JSON.stringify(frontmatter.applyTo)}`);
  }
  lines.push(`description: ${JSON.stringify(frontmatter.description)}`);

  lines.push("---");
  lines.push("");
  lines.push(content);

  return lines.join("\n");
}

/** Copilot MCP server format - stdio server */
interface CopilotMcpStdioServer {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/** Copilot MCP server format - remote server (HTTP/SSE) */
interface CopilotMcpRemoteServer {
  url: string;
  requestInit?: {
    headers?: Record<string, string>;
  };
}

type CopilotMcpServer = CopilotMcpStdioServer | CopilotMcpRemoteServer;

/** Copilot MCP configuration format */
export interface CopilotMcpConfig {
  inputs: unknown[];
  servers: Record<string, CopilotMcpServer>;
}

/**
 * Transform MCP servers from LNAI format to Copilot format.
 *
 * LNAI stdio: { command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${DB_URL}" } }
 * Copilot: { type: "stdio", command: "npx", args: ["-y", "@example/db"], env: { "DB_URL": "${env:DB_URL}" } }
 *
 * LNAI HTTP: { type: "http", url: "...", headers: { ... } }
 * Copilot: { url: "...", requestInit: { headers: { ... } } }
 */
export function transformMcpToCopilot(
  servers: Record<string, McpServer> | undefined
): CopilotMcpConfig | undefined {
  if (!servers || Object.keys(servers).length === 0) {
    return undefined;
  }

  const result: Record<string, CopilotMcpServer> = {};

  for (const [name, server] of Object.entries(servers)) {
    if (server.type === "http" || server.type === "sse") {
      // Remote server
      const copilotServer: CopilotMcpRemoteServer = {
        url: server.url!,
      };
      if (server.headers && Object.keys(server.headers).length > 0) {
        copilotServer.requestInit = {
          headers: transformEnvVarsToCopilot(server.headers),
        };
      }
      result[name] = copilotServer;
    } else if (server.command) {
      // Stdio server
      const copilotServer: CopilotMcpStdioServer = {
        type: "stdio",
        command: server.command,
      };
      if (server.args && server.args.length > 0) {
        copilotServer.args = server.args;
      }
      if (server.env && Object.keys(server.env).length > 0) {
        copilotServer.env = transformEnvVarsToCopilot(server.env);
      }
      result[name] = copilotServer;
    }
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return {
    inputs: [],
    servers: result,
  };
}

/**
 * Transform ${VAR} or ${VAR:-default} to ${env:VAR}
 */
export function transformEnvVarToCopilot(value: string): string {
  return value.replace(/\$\{([^}:]+)(:-[^}]*)?\}/g, "${env:$1}");
}

function transformEnvVarsToCopilot(
  env: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transformEnvVarToCopilot(value);
  }
  return result;
}
