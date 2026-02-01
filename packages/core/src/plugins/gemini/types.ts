export interface GeminiMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  httpUrl?: string;
}

export interface GeminiMcpSettings {
  [key: string]: GeminiMcpServer;
}

export interface GeminiRule {
  dir: string;
  content: string;
}
