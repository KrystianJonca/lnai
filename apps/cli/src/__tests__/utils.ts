import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Create an isolated temporary directory for testing
 */
export async function createTempDir(
  prefix = "lnai-cli-test-"
): Promise<string> {
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
 * Create a minimal .ai/ configuration for testing
 */
export async function createMinimalConfig(rootDir: string): Promise<void> {
  const aiDir = path.join(rootDir, ".ai");
  await fs.mkdir(aiDir, { recursive: true });
  await fs.writeFile(
    path.join(aiDir, "config.json"),
    JSON.stringify(
      {
        tools: {
          claudeCode: { enabled: true, versionControl: false },
          opencode: { enabled: true, versionControl: false },
        },
      },
      null,
      2
    ) + "\n"
  );
}

/**
 * Create a full .ai/ configuration for testing
 */
export async function createFullConfig(rootDir: string): Promise<void> {
  const aiDir = path.join(rootDir, ".ai");
  await fs.mkdir(aiDir, { recursive: true });
  await fs.mkdir(path.join(aiDir, "rules"), { recursive: true });
  await fs.mkdir(path.join(aiDir, "skills"), { recursive: true });

  await fs.writeFile(
    path.join(aiDir, "config.json"),
    JSON.stringify(
      {
        tools: {
          claudeCode: { enabled: true, versionControl: false },
          opencode: { enabled: true, versionControl: false },
        },
      },
      null,
      2
    ) + "\n"
  );

  await fs.writeFile(
    path.join(aiDir, "settings.json"),
    JSON.stringify(
      {
        permissions: {
          allow: ["Bash(git:*)"],
        },
      },
      null,
      2
    ) + "\n"
  );

  await fs.writeFile(
    path.join(aiDir, "AGENTS.md"),
    "# Project Instructions\n\nYou are an AI assistant.\n"
  );
}

/**
 * Create an invalid configuration for testing error handling
 */
export async function createInvalidConfig(rootDir: string): Promise<void> {
  const aiDir = path.join(rootDir, ".ai");
  await fs.mkdir(aiDir, { recursive: true });
  await fs.writeFile(path.join(aiDir, "config.json"), "{ invalid json }");
}
