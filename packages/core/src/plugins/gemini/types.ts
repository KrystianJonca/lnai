interface GeminiMcpOAuth {
  enabled: true;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
}

interface GeminiMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  httpUrl?: string;
  oauth?: GeminiMcpOAuth;
}

export interface GeminiMcpSettings {
  [key: string]: GeminiMcpServer;
}
