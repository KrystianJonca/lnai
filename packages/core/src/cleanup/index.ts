import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { ChangeResult, ManifestEntry, OutputFile } from "../types/index";

/**
 * Compute which files should be deleted based on previous and current manifest entries.
 * Returns paths that exist in previous but not in current.
 */
export function computeFilesToDelete(
  previousFiles: ManifestEntry[],
  currentFiles: OutputFile[]
): string[] {
  const currentPaths = new Set(currentFiles.map((f) => f.path));
  return previousFiles.map((f) => f.path).filter((p) => !currentPaths.has(p));
}

/**
 * Delete files that are no longer in the manifest.
 * Returns ChangeResult[] with action: "delete" for each deleted file.
 * When dryRun is true, no files are actually deleted.
 */
export async function deleteFiles(
  paths: string[],
  rootDir: string,
  dryRun: boolean
): Promise<ChangeResult[]> {
  const results: ChangeResult[] = [];

  for (const relativePath of paths) {
    const fullPath = path.join(rootDir, relativePath);

    // Check if the file exists before attempting deletion
    try {
      await fs.lstat(fullPath);
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        // File doesn't exist, skip silently
        continue;
      }
      throw error;
    }

    if (!dryRun) {
      await fs.unlink(fullPath);
      // Clean up empty parent directories
      await cleanupEmptyParentDirs(fullPath, rootDir);
    }

    results.push({
      path: relativePath,
      action: "delete",
    });
  }

  return results;
}

/**
 * Clean up empty parent directories after file deletion.
 * Stops at the project root directory.
 */
export async function cleanupEmptyParentDirs(
  filePath: string,
  rootDir: string
): Promise<void> {
  let dir = path.dirname(filePath);
  const normalizedRoot = path.normalize(rootDir);

  while (dir !== normalizedRoot && dir.startsWith(normalizedRoot + path.sep)) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        dir = path.dirname(dir);
      } else {
        // Directory not empty, stop
        break;
      }
    } catch {
      // Directory doesn't exist or can't be read, stop
      break;
    }
  }
}
