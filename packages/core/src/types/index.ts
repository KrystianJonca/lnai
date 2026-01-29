import type { ToolId } from "../constants";
import type {
  McpServer,
  Permissions,
  RuleFrontmatter,
  SkillFrontmatter,
  ToolConfig,
} from "../schemas/index";

export type {
  Config,
  McpServer,
  Permissions,
  RuleFrontmatter,
  Settings,
  SkillFrontmatter,
  ToolConfig,
} from "../schemas/index";

export type PermissionLevel = "allow" | "ask" | "deny";

export interface MarkdownFile<T = unknown> {
  path: string;
  frontmatter: T;
  content: string;
}

/** @deprecated Use typed MarkdownFile<T> instead */
export interface MarkdownFrontmatter {
  description?: string;
  paths?: string[];
  name?: string;
}

/** All parsed configuration from the .ai directory */
export interface UnifiedState {
  config: {
    tools?: Partial<Record<ToolId, ToolConfig>>;
  };
  settings: {
    permissions?: Permissions;
    mcpServers?: Record<string, McpServer>;
  } | null;
  agents: string | null;
  rules: MarkdownFile<RuleFrontmatter>[];
  skills: MarkdownFile<SkillFrontmatter>[];
}

export interface OutputFile {
  path: string;
  type: "json" | "text" | "symlink";
  content?: unknown;
  target?: string;
}

export interface ValidationErrorDetail {
  path: string[];
  message: string;
  value?: unknown;
}

export interface ValidationWarningDetail {
  path: string[];
  message: string;
}

/** Feature not supported by a particular tool */
export interface SkippedFeatureDetail {
  feature: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
  warnings: ValidationWarningDetail[];
  skipped: SkippedFeatureDetail[];
}

export interface ChangeResult {
  path: string;
  action: "create" | "update" | "delete" | "unchanged";
  oldHash?: string;
  newHash?: string;
}

export interface SyncResult {
  tool: ToolId;
  changes: ChangeResult[];
  validation: ValidationResult;
}
