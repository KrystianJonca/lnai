import * as fs from "node:fs/promises";
import * as path from "node:path";

import deepmerge from "deepmerge";

import type { ToolId } from "../constants";
import { OVERRIDE_DIRS, TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../constants";
import type { OutputFile } from "../types/index";

/**
 * Information about a file in the override directory
 */
export interface OverrideFile {
  /** Relative path from the override directory (e.g., "commands/custom.md") */
  relativePath: string;
  /** Absolute path to the file */
  absolutePath: string;
}

/**
 * Recursively scan an override directory for all files.
 * Returns empty array if the directory doesn't exist.
 */
export async function scanOverrideDirectory(
  rootDir: string,
  toolId: ToolId
): Promise<OverrideFile[]> {
  const overrideDir = path.join(rootDir, UNIFIED_DIR, OVERRIDE_DIRS[toolId]);

  try {
    await fs.access(overrideDir);
  } catch {
    return [];
  }

  const files: OverrideFile[] = [];
  await scanDir(overrideDir, overrideDir, files);
  return files;
}

async function scanDir(
  baseDir: string,
  currentDir: string,
  files: OverrideFile[]
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await scanDir(baseDir, absolutePath, files);
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, absolutePath);
      files.push({ relativePath, absolutePath });
    }
  }
}

export async function parseJsonFile(
  filePath: string
): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}

/**
 * Deep merge two config objects. Arrays are concatenated and deduplicated.
 */
export function deepMergeConfigs<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>
): T {
  return deepmerge(base, override, {
    arrayMerge: (target, source) => [...new Set([...target, ...source])],
  }) as T;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get OutputFile entries for tool-specific override files.
 * Creates symlinks from the tool's output directory to the .ai override directory,
 * skipping files that already exist at the target location.
 */
export async function getOverrideOutputFiles(
  rootDir: string,
  toolId: ToolId
): Promise<OutputFile[]> {
  const outputDir = TOOL_OUTPUT_DIRS[toolId];
  const overrideFiles = await scanOverrideDirectory(rootDir, toolId);
  const result: OutputFile[] = [];

  for (const overrideFile of overrideFiles) {
    const targetPath = path.join(rootDir, outputDir, overrideFile.relativePath);
    if (await fileExists(targetPath)) {
      continue;
    }
    result.push({
      path: `${outputDir}/${overrideFile.relativePath}`,
      type: "symlink",
      target: `../${UNIFIED_DIR}/${OVERRIDE_DIRS[toolId]}/${overrideFile.relativePath}`,
    });
  }

  return result;
}
