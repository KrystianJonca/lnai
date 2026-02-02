import type { McpServer, ValidationWarningDetail } from "../types/index";

/**
 * Validate MCP servers and return warnings for invalid configurations.
 * Shared validation logic used by cursor, opencode, and copilot plugins.
 *
 * @param mcpServers - Record of MCP server configurations
 * @param pathPrefix - Path prefix for warning details (e.g., ["settings", "mcpServers"])
 * @returns Array of validation warnings for invalid MCP servers
 */
export function validateMcpServers(
  mcpServers: Record<string, McpServer> | undefined,
  pathPrefix: string[]
): ValidationWarningDetail[] {
  const warnings: ValidationWarningDetail[] = [];

  if (!mcpServers) {
    return warnings;
  }

  for (const [name, server] of Object.entries(mcpServers)) {
    const isRemote = server.type === "http" || server.type === "sse";
    const hasCommand = !!server.command;
    const hasUrl = !!server.url;

    if (!isRemote && !hasCommand) {
      warnings.push({
        path: [...pathPrefix, name],
        message: `MCP server "${name}" has no command or type - it will be skipped`,
      });
    }

    if (isRemote && !hasUrl) {
      warnings.push({
        path: [...pathPrefix, name],
        message: `MCP server "${name}" is remote but has no URL - it will be skipped`,
      });
    }
  }

  return warnings;
}
