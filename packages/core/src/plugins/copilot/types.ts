export interface CopilotRuleFrontmatter {
  applyTo?: string;
  description: string;
}

/** Copilot MCP server format - stdio server */
export interface CopilotMcpStdioServer {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/** Copilot MCP server format - remote server (HTTP/SSE) */
export interface CopilotMcpRemoteServer {
  url: string;
  requestInit?: {
    headers?: Record<string, string>;
  };
}

export type CopilotMcpServer = CopilotMcpStdioServer | CopilotMcpRemoteServer;

/** Copilot MCP configuration format */
export interface CopilotMcpConfig {
  inputs: unknown[];
  servers: Record<string, CopilotMcpServer>;
}
