import { z } from "zod";

/** MCP Server configuration (Claude format as source of truth) */
export const mcpServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  type: z.enum(["http", "sse"]).optional(),
  url: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const permissionsSchema = z.object({
  allow: z.array(z.string()).optional(),
  ask: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

export const toolConfigSchema = z.object({
  enabled: z.boolean(),
  versionControl: z.boolean().optional().default(false),
});

export const toolIdSchema = z.enum(["claudeCode", "opencode", "cursor", "copilot"]);

/** Settings configuration (Claude format as source of truth) */
export const settingsSchema = z.object({
  permissions: permissionsSchema.optional(),
  mcpServers: z.record(z.string(), mcpServerSchema).optional(),
});

/** Main config.json structure. Uses partial object to allow partial tool configs. */
export const configSchema = z.object({
  tools: z
    .object({
      claudeCode: toolConfigSchema,
      opencode: toolConfigSchema,
      cursor: toolConfigSchema,
      copilot: toolConfigSchema,
    })
    .partial()
    .optional(),
});

/** Skill frontmatter (name and description required) */
export const skillFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
});

/** Rule frontmatter (paths required) */
export const ruleFrontmatterSchema = z.object({
  paths: z.array(z.string()).min(1),
});

export type McpServer = z.infer<typeof mcpServerSchema>;
export type Permissions = z.infer<typeof permissionsSchema>;
export type ToolConfig = z.infer<typeof toolConfigSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Config = z.infer<typeof configSchema>;
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
export type RuleFrontmatter = z.infer<typeof ruleFrontmatterSchema>;
