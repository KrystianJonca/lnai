import * as fs from "node:fs/promises";
import * as path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { setupTempDirFixture } from "../__tests__/setup";

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
    yellow: (s: string) => s,
    blue: (s: string) => s,
  },
}));

// Import after mocking
import {
  hasUnifiedConfig,
  initUnifiedConfig,
  type ToolId,
  UNIFIED_DIR,
} from "@lnai/core";

describe("init command logic", () => {
  const { getTempDir } = setupTempDirFixture();

  describe("hasUnifiedConfig", () => {
    it("returns false when .ai/ does not exist", async () => {
      const result = await hasUnifiedConfig(getTempDir());
      expect(result).toBe(false);
    });

    it("returns true when .ai/ exists", async () => {
      await fs.mkdir(path.join(getTempDir(), ".ai"));
      const result = await hasUnifiedConfig(getTempDir());
      expect(result).toBe(true);
    });
  });

  describe("initUnifiedConfig", () => {
    it("creates .ai/ directory with config.json", async () => {
      const result = await initUnifiedConfig({ rootDir: getTempDir() });

      expect(result.created).toContain(UNIFIED_DIR);
      expect(result.created).toContain(path.join(UNIFIED_DIR, "config.json"));

      const configPath = path.join(getTempDir(), ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.enabled).toBe(true);
      expect(config.tools.opencode.enabled).toBe(true);
    });

    it("creates rules/ and skills/ directories by default", async () => {
      const result = await initUnifiedConfig({ rootDir: getTempDir() });

      expect(result.created).toContain(path.join(UNIFIED_DIR, "rules"));
      expect(result.created).toContain(path.join(UNIFIED_DIR, "skills"));

      await fs.access(path.join(getTempDir(), ".ai", "rules"));
      await fs.access(path.join(getTempDir(), ".ai", "skills"));
    });

    it("creates minimal config without subdirectories when minimal=true", async () => {
      const result = await initUnifiedConfig({
        rootDir: getTempDir(),
        minimal: true,
      });

      expect(result.created).toContain(UNIFIED_DIR);
      expect(result.created).toContain(path.join(UNIFIED_DIR, "config.json"));
      expect(result.created).not.toContain(path.join(UNIFIED_DIR, "rules"));
      expect(result.created).not.toContain(path.join(UNIFIED_DIR, "skills"));

      await expect(
        fs.access(path.join(getTempDir(), ".ai", "rules"))
      ).rejects.toThrow();
    });

    it("enables only specified tools", async () => {
      await initUnifiedConfig({
        rootDir: getTempDir(),
        tools: ["claudeCode"],
      });

      const configPath = path.join(getTempDir(), ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.enabled).toBe(true);
      expect(config.tools.opencode.enabled).toBe(false);
    });
  });

  describe("--force flag logic", () => {
    it("should be able to overwrite existing .ai/ directory", async () => {
      // First init
      await initUnifiedConfig({ rootDir: getTempDir() });

      // Manually modify config to verify it gets overwritten
      const configPath = path.join(getTempDir(), ".ai", "config.json");
      await fs.writeFile(configPath, '{"modified": true}');

      // Remove and re-init (simulating --force)
      await fs.rm(path.join(getTempDir(), ".ai"), {
        recursive: true,
        force: true,
      });
      await initUnifiedConfig({ rootDir: getTempDir() });

      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools).toBeDefined();
      expect(config.modified).toBeUndefined();
    });
  });

  describe("versionControl option", () => {
    it("sets versionControl to false by default", async () => {
      await initUnifiedConfig({ rootDir: getTempDir() });

      const configPath = path.join(getTempDir(), ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.versionControl).toBe(false);
      expect(config.tools.opencode.versionControl).toBe(false);
      expect(config.tools.cursor.versionControl).toBe(false);
      expect(config.tools.copilot.versionControl).toBe(false);
    });

    it("respects per-tool versionControl settings", async () => {
      const versionControl: Record<ToolId, boolean> = {
        claudeCode: true,
        opencode: false,
        cursor: true,
        copilot: false,
      };

      await initUnifiedConfig({
        rootDir: getTempDir(),
        versionControl,
      });

      const configPath = path.join(getTempDir(), ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.versionControl).toBe(true);
      expect(config.tools.opencode.versionControl).toBe(false);
      expect(config.tools.cursor.versionControl).toBe(true);
      expect(config.tools.copilot.versionControl).toBe(false);
    });

    it("applies versionControl with specific tools", async () => {
      const versionControl: Record<ToolId, boolean> = {
        claudeCode: true,
        opencode: false,
        cursor: false,
        copilot: false,
      };

      await initUnifiedConfig({
        rootDir: getTempDir(),
        tools: ["claudeCode"],
        versionControl,
      });

      const configPath = path.join(getTempDir(), ".ai", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools.claudeCode.enabled).toBe(true);
      expect(config.tools.claudeCode.versionControl).toBe(true);
      expect(config.tools.opencode.enabled).toBe(false);
      expect(config.tools.opencode.versionControl).toBe(false);
    });
  });
});
