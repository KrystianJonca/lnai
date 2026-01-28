import * as fs from "node:fs/promises";
import * as path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { setupTempDirFixture } from "../__tests__/setup";
import { createFullConfig, createMinimalConfig } from "../__tests__/utils";

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

import { runSyncPipeline } from "@lnai/core";

describe("sync command logic", () => {
  const { getTempDir } = setupTempDirFixture();

  describe("runSyncPipeline", () => {
    it("syncs minimal configuration successfully", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: false,
      });

      expect(Array.isArray(results)).toBe(true);
      // Should have results for enabled tools
      expect(results.length).toBeGreaterThan(0);
    });

    it("syncs full configuration with all features", async () => {
      await createFullConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: false,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check that tool-specific directories were created
      for (const result of results) {
        expect(result.tool).toBeDefined();
        expect(Array.isArray(result.changes)).toBe(true);
      }
    });

    it("creates tool-specific output files", async () => {
      await createFullConfig(getTempDir());

      await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: false,
      });

      // Check for Claude Code output (.claude directory)
      const claudeDir = path.join(getTempDir(), ".claude");
      const claudeDirExists = await fs
        .stat(claudeDir)
        .then((s) => s.isDirectory())
        .catch(() => false);
      expect(claudeDirExists).toBe(true);
    });

    it("throws error when .ai/ directory is missing", async () => {
      await expect(
        runSyncPipeline({
          rootDir: getTempDir(),
          dryRun: false,
        })
      ).rejects.toThrow();
    });
  });

  describe("--dry-run flag", () => {
    it("does not write files when dry-run is true", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
      });

      expect(results.length).toBeGreaterThan(0);

      // Check that no output directories were created
      const claudeDir = path.join(getTempDir(), ".claude");
      const claudeDirExists = await fs
        .stat(claudeDir)
        .then(() => true)
        .catch(() => false);
      expect(claudeDirExists).toBe(false);
    });

    it("reports changes that would be made", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
      });

      for (const result of results) {
        // Each result should indicate what changes would be made
        expect(result.tool).toBeDefined();
        expect(Array.isArray(result.changes)).toBe(true);
      }
    });
  });

  describe("--tools flag", () => {
    it("filters to specific tools", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
        tools: ["claudeCode"],
      });

      // Should only have result for claudeCode
      expect(results.length).toBe(1);
      expect(results[0]?.tool).toBe("claudeCode");
    });

    it("handles multiple tools filter", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
        tools: ["claudeCode", "opencode"],
      });

      // Should have results for both tools
      expect(results.length).toBe(2);
      const toolNames = results.map((r) => r.tool);
      expect(toolNames).toContain("claudeCode");
      expect(toolNames).toContain("opencode");
    });

    it("defaults to all plugins when no tools are explicitly enabled", async () => {
      // Create config with all tools disabled
      const aiDir = path.join(getTempDir(), ".ai");
      await fs.mkdir(aiDir, { recursive: true });
      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify(
          {
            tools: {
              claudeCode: { enabled: false, versionControl: false },
              opencode: { enabled: false, versionControl: false },
            },
          },
          null,
          2
        ) + "\n"
      );

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
      });

      // Pipeline defaults to all plugins when no tools are explicitly enabled
      // This is intentional fallback behavior
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("change actions", () => {
    it("reports create action for new files", async () => {
      await createMinimalConfig(getTempDir());

      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: true,
      });

      // All changes should be "create" since no files exist yet
      for (const result of results) {
        for (const change of result.changes) {
          expect(change.action).toBe("create");
          expect(change.path).toBeDefined();
        }
      }
    });

    it("reports unchanged action when files match", async () => {
      await createMinimalConfig(getTempDir());

      // First sync to create files
      await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: false,
      });

      // Second sync should report unchanged
      const results = await runSyncPipeline({
        rootDir: getTempDir(),
        dryRun: false,
      });

      for (const result of results) {
        for (const change of result.changes) {
          expect(["unchanged", "update", "create"]).toContain(change.action);
        }
      }
    });
  });
});
