/** OpenCode-specific static OAuth config for remote servers */
interface OpenCodeMcpOAuth {
  clientId: string;
  clientSecret?: string;
  scope?: string;
  callbackPort?: number;
}

/** OpenCode-specific MCP server output format */
export interface OpenCodeMcpServer {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  oauth?: OpenCodeMcpOAuth;
}

export type OpenCodePermission = Record<
  string,
  Record<string, "allow" | "ask" | "deny">
>;
