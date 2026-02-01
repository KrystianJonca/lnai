import type {
  MarkdownFile,
  McpServer,
  RuleFrontmatter,
} from "../../types/index";
import type { GeminiMcpSettings } from "./types";
import { getDirFromGlob } from "./utils";

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
  }

  return Object.keys(geminiMcp).length > 0 ? geminiMcp : undefined;
}

export function groupRulesByDirectory(
  rules: MarkdownFile<RuleFrontmatter>[]
): Map<string, string[]> {
  const rulesMap = new Map<string, string[]>();

  for (const rule of rules) {
    for (const pathGlob of rule.frontmatter.paths) {
      const dir = getDirFromGlob(pathGlob);

      if (!rulesMap.has(dir)) {
        rulesMap.set(dir, []);
      }

      const content = `## ${rule.path}\n\n${rule.content}\n`;
      rulesMap.get(dir)?.push(content);
    }
  }

  return rulesMap;
}
