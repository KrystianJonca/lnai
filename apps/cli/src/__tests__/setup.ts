import { afterEach, beforeEach } from "vitest";

import { cleanupTempDir, createTempDir } from "./utils";

/**
 * Set up a temporary directory fixture for tests.
 *
 * Creates a temp directory before each test and cleans it up after.
 * Also handles changing and restoring the working directory.
 *
 * @example
 * ```ts
 * describe("my test suite", () => {
 *   const { getTempDir } = setupTempDirFixture();
 *
 *   it("works with temp dir", async () => {
 *     const tempDir = getTempDir();
 *     // ... test code using tempDir
 *   });
 * });
 * ```
 */
export function setupTempDirFixture(): { getTempDir: () => string } {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  });

  return {
    getTempDir: () => tempDir,
  };
}
