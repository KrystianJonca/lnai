import * as fs from "node:fs/promises";
import * as path from "node:path";

import { CONFIG_DIRS, CONFIG_FILES, UNIFIED_DIR } from "../constants";
import { FileNotFoundError, ParseError } from "../errors";
import type {
  MarkdownFile,
  RuleFrontmatter,
  SkillFrontmatter,
  UnifiedState,
} from "../types/index";
import { parseFrontmatter } from "./frontmatter";

export { parseFrontmatter } from "./frontmatter";

/**
 * Parse the unified .ai/ configuration directory.
 * Reads config.json, settings.json, AGENTS.md, rules, and skills.
 */
export async function parseUnifiedConfig(
  rootDir: string
): Promise<UnifiedState> {
  const aiDir = path.join(rootDir, UNIFIED_DIR);

  if (!(await fileExists(aiDir))) {
    throw new FileNotFoundError(
      `Unified config directory not found: ${aiDir}`,
      aiDir
    );
  }

  const configPath = path.join(aiDir, CONFIG_FILES.config);
  let config: UnifiedState["config"];
  try {
    config = await readJsonFile<UnifiedState["config"]>(configPath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      config = { tools: {} };
    } else {
      throw error;
    }
  }

  const settingsPath = path.join(aiDir, CONFIG_FILES.settings);
  let settings: UnifiedState["settings"] = null;
  if (await fileExists(settingsPath)) {
    settings = await readJsonFile<UnifiedState["settings"]>(settingsPath);
  }

  const agentsPath = path.join(aiDir, CONFIG_FILES.agents);
  let agents: string | null = null;
  if (await fileExists(agentsPath)) {
    agents = await readMarkdownFile(agentsPath);
  }

  const rulesDir = path.join(aiDir, CONFIG_DIRS.rules);
  const rules = await readMarkdownDirectory<RuleFrontmatter>(rulesDir);

  const skillsDir = path.join(aiDir, CONFIG_DIRS.skills);
  const skills = await readSkillsDirectory(skillsDir);

  return {
    config,
    settings,
    agents,
    rules,
    skills,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new FileNotFoundError(`File not found: ${filePath}`, filePath);
    }
    throw new ParseError(
      `Failed to parse JSON: ${filePath}`,
      filePath,
      error as Error
    );
  }
}

async function readMarkdownFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new FileNotFoundError(`File not found: ${filePath}`, filePath);
    }
    throw new ParseError(
      `Failed to read markdown: ${filePath}`,
      filePath,
      error as Error
    );
  }
}

async function readMarkdownDirectory<T>(
  dirPath: string
): Promise<MarkdownFile<T>[]> {
  const files: MarkdownFile<T>[] = [];

  if (!(await fileExists(dirPath))) {
    return files;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const filePath = path.join(dirPath, entry.name);
      const content = await readMarkdownFile(filePath);
      const parsed = parseFrontmatter(content);

      files.push({
        path: entry.name,
        frontmatter: parsed.frontmatter as T,
        content: parsed.content,
      });
    }
  }

  return files;
}

async function readSkillsDirectory(
  dirPath: string
): Promise<MarkdownFile<SkillFrontmatter>[]> {
  const skills: MarkdownFile<SkillFrontmatter>[] = [];

  if (!(await fileExists(dirPath))) {
    return skills;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillFile = path.join(dirPath, entry.name, "SKILL.md");
      if (await fileExists(skillFile)) {
        const content = await readMarkdownFile(skillFile);
        const parsed = parseFrontmatter(content);

        skills.push({
          path: entry.name,
          frontmatter: parsed.frontmatter as SkillFrontmatter,
          content: parsed.content,
        });
      }
    }
  }

  return skills;
}
