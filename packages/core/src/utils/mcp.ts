import type {
  McpOAuth,
  McpServer,
  ValidationWarningDetail,
} from "../types/index";

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

/**
 * Warn about individual OAuth fields that a tool's native MCP format doesn't
 * support, for MCP servers that have `oauth` configured. Each tool that
 * supports OAuth supports a different subset of fields (e.g. Copilot has no
 * `clientSecret`/`scopes`, Cursor and OpenCode have no `callbackPort`), so
 * unsupported fields are dropped during transform and reported here rather
 * than treating OAuth as all-or-nothing.
 *
 * @param mcpServers - Record of MCP server configurations
 * @param pathPrefix - Path prefix for warning details (e.g., ["settings", "mcpServers"])
 * @param toolName - Display name of the tool being validated (e.g., "Cursor")
 * @param unsupportedFields - OAuth fields this tool's format doesn't support
 * @returns Array of validation warnings for servers with unsupported OAuth fields configured
 */
export function validateOAuthFieldSupport(
  mcpServers: Record<string, McpServer> | undefined,
  pathPrefix: string[],
  toolName: string,
  unsupportedFields: Array<keyof McpOAuth>
): ValidationWarningDetail[] {
  const warnings: ValidationWarningDetail[] = [];

  if (!mcpServers) {
    return warnings;
  }

  for (const [name, server] of Object.entries(mcpServers)) {
    if (!server.oauth) {
      continue;
    }

    const dropped = unsupportedFields.filter(
      (field) => server.oauth?.[field] !== undefined
    );

    if (dropped.length > 0) {
      warnings.push({
        path: [...pathPrefix, name, "oauth"],
        message: `MCP server "${name}" has OAuth ${dropped.join(", ")} configured - ${toolName} does not support syncing ${dropped.length > 1 ? "these fields" : "this field"}, so ${dropped.length > 1 ? "they" : "it"} will be skipped`,
      });
    }
  }

  return warnings;
}
