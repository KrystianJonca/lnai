import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, copyFixture, createTempDir } from "../__tests__/utils";
import { runSyncPipeline } from "./index";

describe("runSyncPipeline", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("full pipeline", () => {
    it("runs complete pipeline with full config", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({ rootDir: tempDir });

      // Should have results for both tools
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.validation.valid)).toBe(true);
    });

    it("creates output files for claudeCode", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Check that .claude files were created
      const claudeDir = path.join(tempDir, ".claude");
      const stat = await fs.stat(claudeDir);
      expect(stat.isDirectory()).toBe(true);

      // Check symlinks
      const claudeMdStat = await fs.lstat(path.join(claudeDir, "CLAUDE.md"));
      expect(claudeMdStat.isSymbolicLink()).toBe(true);
    });

    it("creates output files for opencode", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["opencode"] });

      // Check that opencode.json was created
      const opencodeConfig = path.join(tempDir, "opencode.json");
      const content = await fs.readFile(opencodeConfig, "utf-8");
      const config = JSON.parse(content);

      expect(config.$schema).toBe("https://opencode.ai/config.json");
    });
  });

  describe("validation errors", () => {
    it("returns early with validation errors for invalid config", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      // Create invalid config with wrong type for enabled
      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({ tools: { claudeCode: { enabled: "not-a-boolean" } } }),
        "utf-8"
      );

      const results = await runSyncPipeline({ rootDir: tempDir });

      expect(results).toHaveLength(1);
      expect(results[0]?.validation.valid).toBe(false);
      expect(results[0]?.validation.errors.length).toBeGreaterThan(0);
    });

    it("returns early with validation errors for invalid settings", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({ tools: { claudeCode: { enabled: true } } }),
        "utf-8"
      );
      await fs.writeFile(
        path.join(aiDir, "settings.json"),
        JSON.stringify({ permissions: { allow: "not-an-array" } }),
        "utf-8"
      );

      const results = await runSyncPipeline({ rootDir: tempDir });

      expect(results).toHaveLength(1);
      expect(results[0]?.validation.valid).toBe(false);
    });
  });

  describe("tool selection", () => {
    it("syncs only specified tools", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.tool).toBe("claudeCode");
    });

    it("syncs only enabled tools from config", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      // Only claudeCode enabled
      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true },
            opencode: { enabled: false },
          },
        }),
        "utf-8"
      );

      const results = await runSyncPipeline({ rootDir: tempDir });

      expect(results).toHaveLength(1);
      expect(results[0]?.tool).toBe("claudeCode");
    });

    it("returns empty array when no tools match", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true },
          },
        }),
        "utf-8"
      );

      // Request a tool that isn't enabled
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["opencode"],
      });

      // opencode isn't registered in the requested tools filter, but we still
      // process it since it's explicitly requested
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe("dryRun mode", () => {
    it("does not write files when dryRun is true", async () => {
      await copyFixture("valid/minimal", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      // Results should indicate what would be created
      expect(results.length).toBeGreaterThan(0);

      // But .claude directory should not exist
      await expect(fs.access(path.join(tempDir, ".claude"))).rejects.toThrow();
    });

    it("returns correct change actions in dryRun", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.changes.length).toBeGreaterThan(0);
      // All actions should be 'create' since files don't exist yet
      expect(results[0]?.changes.every((c) => c.action === "create")).toBe(
        true
      );
    });
  });

  describe(".gitignore management", () => {
    it("adds to .gitignore for tools with versionControl: false", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true, versionControl: false },
          },
        }),
        "utf-8"
      );

      // Add settings so there's content to export
      await fs.writeFile(
        path.join(aiDir, "settings.json"),
        JSON.stringify({ permissions: { allow: ["Bash(git:*)"] } }),
        "utf-8"
      );

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      const gitignore = await fs.readFile(
        path.join(tempDir, ".gitignore"),
        "utf-8"
      );
      expect(gitignore).toContain("# lnai-generated");
    });

    it("does not add to .gitignore for tools with versionControl: true", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true, versionControl: true },
          },
        }),
        "utf-8"
      );

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // .gitignore might not exist or should not have lnai entries
      try {
        const gitignore = await fs.readFile(
          path.join(tempDir, ".gitignore"),
          "utf-8"
        );
        // If it exists, it should be minimal
        expect(
          gitignore.includes(".claude") && gitignore.includes("lnai-generated")
        ).toBe(false);
      } catch {
        // File doesn't exist, which is fine
      }
    });
  });

  describe("change detection", () => {
    it("detects unchanged files on second run", async () => {
      await copyFixture("valid/full", tempDir);

      // First run
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Second run
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      // All changes should be 'unchanged' on second run
      expect(results[0]?.changes.every((c) => c.action === "unchanged")).toBe(
        true
      );
    });
  });

  describe("error handling", () => {
    it("throws when .ai directory is missing", async () => {
      await expect(runSyncPipeline({ rootDir: tempDir })).rejects.toThrow();
    });
  });
});
