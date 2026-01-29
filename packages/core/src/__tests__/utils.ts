import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { UnifiedState } from "../types/index";

/**
 * Create an isolated temporary directory for testing
 */
export async function createTempDir(prefix = "lnai-test-"): Promise<string> {
  const tempBase = os.tmpdir();
  return await fs.mkdtemp(path.join(tempBase, prefix));
}

/**
 * Remove a temporary directory and all its contents
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Copy a fixture directory to a temp location
 * @param fixtureName - Name of the fixture (e.g., "valid/minimal")
 * @param destDir - Destination directory
 */
export async function copyFixture(
  fixtureName: string,
  destDir: string
): Promise<void> {
  const fixturesDir = path.join(__dirname, "..", "__fixtures__");
  const srcDir = path.join(fixturesDir, fixtureName);
  await copyDir(srcDir, destDir);
}

/**
 * Recursively copy a directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Create a minimal valid UnifiedState for testing
 */
export function createMinimalState(
  overrides: Partial<UnifiedState> = {}
): UnifiedState {
  return {
    config: { tools: {} },
    settings: null,
    agents: null,
    rules: [],
    skills: [],
    ...overrides,
  };
}

/**
 * Create a full UnifiedState with all features for testing
 */
export function createFullState(
  overrides: Partial<UnifiedState> = {}
): UnifiedState {
  return {
    config: {
      tools: {
        claudeCode: { enabled: true, versionControl: false },
        opencode: { enabled: true, versionControl: true },
        cursor: { enabled: true, versionControl: false },
        copilot: { enabled: true, versionControl: false },
      },
    },
    settings: {
      permissions: {
        allow: ["Bash(git:*)"],
        ask: ["Bash(npm:*)"],
        deny: ["Read(.env)"],
      },
      mcpServers: {
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
          env: { DB_URL: "${DB_URL}" },
        },
      },
    },
    agents: "# Project Instructions\n\nYou are an AI assistant.",
    rules: [
      {
        path: "typescript.md",
        frontmatter: { paths: ["src/**/*.ts"] },
        content: "# TypeScript Rules",
      },
    ],
    skills: [
      {
        path: "deploy",
        frontmatter: { name: "deploy", description: "Deploy to production" },
        content: "# Deploy Skill",
      },
    ],
    ...overrides,
  };
}

/**
 * Get the path to a fixture file
 */
export function getFixturePath(...segments: string[]): string {
  return path.join(__dirname, "..", "__fixtures__", ...segments);
}
