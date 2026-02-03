import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { ToolId } from "../constants";
import { UNIFIED_DIR } from "../constants";
import type {
  LnaiManifest,
  ManifestEntry,
  OutputFile,
  ToolManifest,
} from "../types/index";
import { computeHash } from "../writer/index";

export const MANIFEST_FILENAME = ".lnai-manifest.json";

/**
 * Read the LNAI manifest from the .ai directory.
 * Returns null if the manifest doesn't exist.
 */
export async function readManifest(
  rootDir: string
): Promise<LnaiManifest | null> {
  const manifestPath = path.join(rootDir, UNIFIED_DIR, MANIFEST_FILENAME);

  try {
    const content = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(content) as LnaiManifest;

    // Validate version
    if (manifest.version !== 1) {
      console.warn(
        `[lnai] Unknown manifest version ${manifest.version}, skipping cleanup`
      );
      return null;
    }

    return manifest;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return null;
    }
    // For parse errors, warn and return null to skip cleanup
    console.warn(`[lnai] Failed to read manifest: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Write the LNAI manifest to the .ai directory.
 */
export async function writeManifest(
  rootDir: string,
  manifest: LnaiManifest
): Promise<void> {
  const manifestPath = path.join(rootDir, UNIFIED_DIR, MANIFEST_FILENAME);
  const content = JSON.stringify(manifest, null, 2) + "\n";
  await fs.writeFile(manifestPath, content, "utf-8");
}

/**
 * Build a tool manifest from output files.
 */
export function buildToolManifest(
  toolId: ToolId,
  files: OutputFile[]
): ToolManifest {
  const entries: ManifestEntry[] = files.map((file) => {
    const entry: ManifestEntry = {
      path: file.path,
      type: file.type,
    };

    if (file.type === "symlink") {
      entry.target = file.target;
    } else {
      // Compute hash for non-symlink files
      const content =
        file.type === "json"
          ? JSON.stringify(file.content, null, 2) + "\n"
          : String(file.content);
      entry.hash = computeHash(content);
    }

    return entry;
  });

  return {
    version: 1,
    tool: toolId,
    generatedAt: new Date().toISOString(),
    files: entries,
  };
}

/**
 * Update a single tool's manifest entry.
 */
export function updateToolManifest(
  manifest: LnaiManifest,
  toolId: ToolId,
  files: OutputFile[]
): LnaiManifest {
  return {
    ...manifest,
    tools: {
      ...manifest.tools,
      [toolId]: buildToolManifest(toolId, files),
    },
  };
}

/**
 * Create an empty manifest.
 */
export function createEmptyManifest(): LnaiManifest {
  return {
    version: 1,
    tools: {},
  };
}
