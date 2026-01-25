import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  CONFIG_DIRS,
  CONFIG_FILES,
  TOOL_IDS,
  type ToolId,
  UNIFIED_DIR,
} from "../constants";
import type { Config } from "../types/index";

export interface InitOptions {
  rootDir: string;
  tools?: ToolId[];
  minimal?: boolean;
}

export interface InitResult {
  created: string[];
}

export async function hasUnifiedConfig(rootDir: string): Promise<boolean> {
  const aiDir = path.join(rootDir, UNIFIED_DIR);
  try {
    const stats = await fs.stat(aiDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export function generateDefaultConfig(tools?: ToolId[]): Config {
  const enabledTools = tools ?? TOOL_IDS;

  const toolsConfig: Config["tools"] = {};

  for (const toolId of TOOL_IDS) {
    toolsConfig[toolId] = {
      enabled: enabledTools.includes(toolId),
      versionControl: false,
    };
  }

  return {
    tools: toolsConfig,
  };
}

export async function initUnifiedConfig(
  options: InitOptions
): Promise<InitResult> {
  const { rootDir, tools, minimal = false } = options;
  const aiDir = path.join(rootDir, UNIFIED_DIR);
  const created: string[] = [];

  await fs.mkdir(aiDir, { recursive: true });
  created.push(UNIFIED_DIR);

  const config = generateDefaultConfig(tools);
  const configPath = path.join(aiDir, CONFIG_FILES.config);
  await fs.writeFile(
    configPath,
    JSON.stringify(config, null, 2) + "\n",
    "utf-8"
  );
  created.push(path.join(UNIFIED_DIR, CONFIG_FILES.config));

  if (!minimal) {
    for (const dir of [CONFIG_DIRS.rules, CONFIG_DIRS.skills]) {
      const dirPath = path.join(aiDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
      created.push(path.join(UNIFIED_DIR, dir));

      const gitkeepPath = path.join(dirPath, ".gitkeep");
      await fs.writeFile(gitkeepPath, "", "utf-8");
      created.push(path.join(UNIFIED_DIR, dir, ".gitkeep"));
    }
  }

  return { created };
}
