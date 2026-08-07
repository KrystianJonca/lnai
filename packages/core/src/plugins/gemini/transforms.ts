import type { McpServer } from "../../types/index";
import type { GeminiMcpSettings } from "./types";

export function transformMcpToGemini(
  mcpServers: Record<string, McpServer> | undefined
): GeminiMcpSettings | undefined {
  if (!mcpServers) {
    return undefined;
  }

  const geminiMcp: GeminiMcpSettings = {};

  for (const [name, config] of Object.entries(mcpServers)) {
    if (!config.command && !config.url && !config.type) {
      continue;
    }

    geminiMcp[name] = {
      command: config.command,
      args: config.args,
      env: config.env,
    };

    if (config.url) {
      geminiMcp[name].httpUrl = config.url;
    }

    if (config.oauth) {
      geminiMcp[name].oauth = {
        enabled: true,
        clientId: config.oauth.clientId,
        ...(config.oauth.clientSecret !== undefined && {
          clientSecret: config.oauth.clientSecret,
        }),
        ...(config.oauth.scopes !== undefined && {
          scopes: config.oauth.scopes,
        }),
      };
    }
  }

  return Object.keys(geminiMcp).length > 0 ? geminiMcp : undefined;
}
