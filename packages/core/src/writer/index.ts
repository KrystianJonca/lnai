import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { WriteError } from "../errors";
import type { ChangeResult, OutputFile } from "../types/index";

/**
 * Options for the file writer
 */
export interface WriterOptions {
  /** Root directory for output */
  rootDir: string;
  /** Preview changes without writing */
  dryRun?: boolean;
}

export function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

async function readExistingFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function getSymlinkTarget(filePath: string): Promise<string | null> {
  try {
    const stats = await fs.lstat(filePath);
    if (stats.isSymbolicLink()) {
      return await fs.readlink(filePath);
    }
    return null;
  } catch {
    return null;
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removeIfExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.lstat(filePath);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
  }
}

async function writeSingleFile(
  file: OutputFile,
  rootDir: string,
  dryRun: boolean
): Promise<ChangeResult> {
  const fullPath = path.join(rootDir, file.path);
  const dirPath = path.dirname(fullPath);

  if (file.type === "symlink") {
    const target = file.target!;
    const existingTarget = await getSymlinkTarget(fullPath);

    if (existingTarget === target) {
      return {
        path: file.path,
        action: "unchanged",
      };
    }

    if (!dryRun) {
      await ensureDir(dirPath);
      await removeIfExists(fullPath);
      await fs.symlink(target, fullPath);
    }

    return {
      path: file.path,
      action: existingTarget ? "update" : "create",
    };
  }

  const content =
    file.type === "json"
      ? JSON.stringify(file.content, null, 2) + "\n"
      : String(file.content);

  const newHash = computeHash(content);
  const existingContent = await readExistingFile(fullPath);
  const oldHash = existingContent ? computeHash(existingContent) : undefined;

  if (oldHash === newHash) {
    return {
      path: file.path,
      action: "unchanged",
      oldHash,
      newHash,
    };
  }

  if (!dryRun) {
    await ensureDir(dirPath);
    await fs.writeFile(fullPath, content, "utf-8");
  }

  return {
    path: file.path,
    action: existingContent ? "update" : "create",
    oldHash,
    newHash,
  };
}

export async function writeFiles(
  files: OutputFile[],
  options: WriterOptions
): Promise<ChangeResult[]> {
  const { rootDir, dryRun = false } = options;
  const results: ChangeResult[] = [];

  for (const file of files) {
    try {
      const result = await writeSingleFile(file, rootDir, dryRun);
      results.push(result);
    } catch (error) {
      throw new WriteError(
        `Failed to write file: ${file.path}`,
        file.path,
        error as Error
      );
    }
  }

  return results;
}

/**
 * Update .gitignore with paths that should not be version controlled.
 * Manages a dedicated "lnai-generated" section to avoid conflicts with user entries.
 */
export async function updateGitignore(
  rootDir: string,
  paths: string[]
): Promise<void> {
  const gitignorePath = path.join(rootDir, ".gitignore");
  let content = "";

  try {
    content = await fs.readFile(gitignorePath, "utf-8");
  } catch {
    // File doesn't exist, start fresh
  }

  const marker = "# lnai-generated";
  const endMarker = "# end lnai-generated";

  const markerRegex = new RegExp(`${marker}[\\s\\S]*?${endMarker}\\n?`, "g");
  content = content.replace(markerRegex, "");
  content = content.trimEnd();

  const newSection = ["", marker, ...paths.map((p) => p), endMarker, ""].join(
    "\n"
  );

  content = content + newSection;

  await fs.writeFile(gitignorePath, content, "utf-8");
}
