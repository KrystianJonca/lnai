import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";

// Mock ora and chalk to avoid spinner output in tests
vi.mock("ora", () => ({
  default: () => ({
    start: () => ({ succeed: vi.fn(), fail: vi.fn() }),
    succeed: vi.fn(),
    fail: vi.fn(),
  }),
}));

vi.mock("chalk", () => ({
  default: {
    gray: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
  },
}));

// Import after mocking
import { hasUnifiedConfig, initUnifiedConfig, UNIFIED_DIR } from "@lnai/core";

describe("init command logic", () => {
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

  describe("hasUnifiedConfig", () => {
    it("returns false when .ai/ does not exist", async () => {
      const result = await hasUnifiedConfig(tempDir);
      expect(result).toBe(false);
    });

    it("returns true when .ai/ exists", async () => {
      await fs.mkdir(path.join(tempDir, ".ai"));
      const result = await hasUnifiedConfig(tempDir);
      expect(result).toBe(true);
    });
  });

  describe("initUnifiedConfig", () => {
    it("creates .ai/ directory with config.json", async () => {
      const result = await initUnifiedConfig({ rootDir: tempDir });

      expect(result.created).toContain(UNIFIED_DIR);
      expect(result.created).toContain(path.join(UNIFIED_DIR, "config.json"));

      const configPath = path.join(tempDir, ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.enabled).toBe(true);
      expect(config.tools.opencode.enabled).toBe(true);
    });

    it("creates rules/ and skills/ directories by default", async () => {
      const result = await initUnifiedConfig({ rootDir: tempDir });

      expect(result.created).toContain(path.join(UNIFIED_DIR, "rules"));
      expect(result.created).toContain(path.join(UNIFIED_DIR, "skills"));

      await fs.access(path.join(tempDir, ".ai", "rules"));
      await fs.access(path.join(tempDir, ".ai", "skills"));
    });

    it("creates minimal config without subdirectories when minimal=true", async () => {
      const result = await initUnifiedConfig({
        rootDir: tempDir,
        minimal: true,
      });

      expect(result.created).toContain(UNIFIED_DIR);
      expect(result.created).toContain(path.join(UNIFIED_DIR, "config.json"));
      expect(result.created).not.toContain(path.join(UNIFIED_DIR, "rules"));
      expect(result.created).not.toContain(path.join(UNIFIED_DIR, "skills"));

      await expect(
        fs.access(path.join(tempDir, ".ai", "rules"))
      ).rejects.toThrow();
    });

    it("enables only specified tools", async () => {
      await initUnifiedConfig({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      const configPath = path.join(tempDir, ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.enabled).toBe(true);
      expect(config.tools.opencode.enabled).toBe(false);
    });
  });

  describe("--force flag logic", () => {
    it("should be able to overwrite existing .ai/ directory", async () => {
      // First init
      await initUnifiedConfig({ rootDir: tempDir });

      // Manually modify config to verify it gets overwritten
      const configPath = path.join(tempDir, ".ai", "config.json");
      await fs.writeFile(configPath, '{"modified": true}');

      // Remove and re-init (simulating --force)
      await fs.rm(path.join(tempDir, ".ai"), { recursive: true, force: true });
      await initUnifiedConfig({ rootDir: tempDir });

      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools).toBeDefined();
      expect(config.modified).toBeUndefined();
    });
  });
});
