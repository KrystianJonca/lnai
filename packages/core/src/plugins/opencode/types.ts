/** OpenCode-specific MCP server output format */
export interface OpenCodeMcpServer {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
}

export type OpenCodePermission = Record<
  string,
  Record<string, "allow" | "ask" | "deny">
>;
