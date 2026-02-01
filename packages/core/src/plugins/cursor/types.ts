export interface CursorRuleFrontmatter {
  description: string;
  globs: string[];
  alwaysApply: boolean;
}

/** Cursor-specific MCP server output format */
export interface CursorMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface CursorPermissions {
  allow: string[];
  deny: string[];
}

export interface TransformPermissionsResult {
  permissions: CursorPermissions | undefined;
  hasAskPermissions: boolean;
}
