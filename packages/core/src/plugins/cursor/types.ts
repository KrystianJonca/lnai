export interface CursorRuleFrontmatter {
  description: string;
  globs: string[];
  alwaysApply: boolean;
}

/** Cursor-specific static OAuth config for remote servers */
interface CursorMcpAuth {
  CLIENT_ID: string;
  CLIENT_SECRET?: string;
  scopes?: string[];
}

/** Cursor-specific MCP server output format */
export interface CursorMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  auth?: CursorMcpAuth;
}

interface CursorPermissions {
  allow: string[];
  deny: string[];
}

export interface TransformPermissionsResult {
  permissions: CursorPermissions | undefined;
  hasAskPermissions: boolean;
}
