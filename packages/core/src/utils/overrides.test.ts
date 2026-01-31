import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import type { OutputFile } from "../types/index";
import {
  applyFileOverrides,
  fileExists,
  getOverrideOutputFiles,
  parseJsonFile,
  scanOverrideDirectory,
} from "./overrides";

describe("overrides utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("scanOverrideDirectory", () => {
    it("returns empty array when directory does not exist", async () => {
      const files = await scanOverrideDirectory(tempDir, "claudeCode");

      expect(files).toEqual([]);
    });

    it("returns files from override directory", async () => {
      // Create .ai/.claude directory with files
      const overrideDir = path.join(tempDir, ".ai", ".claude");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(
        path.join(overrideDir, "settings.json"),
        '{"model": "opus"}'
      );
      await fs.writeFile(path.join(overrideDir, "config.md"), "# Config");

      const files = await scanOverrideDirectory(tempDir, "claudeCode");

      expect(files).toHaveLength(2);
      expect(files.map((f) => f.relativePath).sort()).toEqual([
        "config.md",
        "settings.json",
      ]);
    });

    it("recursively scans nested directories", async () => {
      // Create nested structure
      const nestedDir = path.join(
        tempDir,
        ".ai",
        ".claude",
        "commands",
        "deep"
      );
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, "nested.md"), "# Nested");

      const files = await scanOverrideDirectory(tempDir, "claudeCode");

      expect(files).toHaveLength(1);
      expect(files[0]?.relativePath).toBe("commands/deep/nested.md");
    });

    it("scans opencode override directory", async () => {
      const overrideDir = path.join(tempDir, ".ai", ".opencode");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(
        path.join(overrideDir, "opencode.json"),
        '{"theme": "dark"}'
      );

      const files = await scanOverrideDirectory(tempDir, "opencode");

      expect(files).toHaveLength(1);
      expect(files[0]?.relativePath).toBe("opencode.json");
    });
  });

  describe("parseJsonFile", () => {
    it("parses valid JSON file", async () => {
      const filePath = path.join(tempDir, "test.json");
      await fs.writeFile(
        filePath,
        JSON.stringify({ key: "value", nested: { a: 1 } })
      );

      const result = await parseJsonFile(filePath);

      expect(result).toEqual({ key: "value", nested: { a: 1 } });
    });

    it("throws on invalid JSON", async () => {
      const filePath = path.join(tempDir, "invalid.json");
      await fs.writeFile(filePath, "not valid json");

      await expect(parseJsonFile(filePath)).rejects.toThrow();
    });
  });

  describe("fileExists", () => {
    it("returns true for existing file", async () => {
      const filePath = path.join(tempDir, "exists.txt");
      await fs.writeFile(filePath, "content");

      const result = await fileExists(filePath);

      expect(result).toBe(true);
    });

    it("returns false for non-existing file", async () => {
      const filePath = path.join(tempDir, "does-not-exist.txt");

      const result = await fileExists(filePath);

      expect(result).toBe(false);
    });

    it("returns true for existing directory", async () => {
      const dirPath = path.join(tempDir, "dir");
      await fs.mkdir(dirPath);

      const result = await fileExists(dirPath);

      expect(result).toBe(true);
    });
  });

  describe("getOverrideOutputFiles", () => {
    it("creates symlink with correct relative path for top-level file", async () => {
      const overrideDir = path.join(tempDir, ".ai", ".claude");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(path.join(overrideDir, "custom.json"), "{}");

      const result = await getOverrideOutputFiles(tempDir, "claudeCode");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: ".claude/custom.json",
        type: "symlink",
        target: "../.ai/.claude/custom.json",
      });
    });

    it("creates symlink with correct relative path for nested file", async () => {
      const nestedDir = path.join(
        tempDir,
        ".ai",
        ".claude",
        "commands",
        "deep"
      );
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, "nested.md"), "# Nested");

      const result = await getOverrideOutputFiles(tempDir, "claudeCode");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: ".claude/commands/deep/nested.md",
        type: "symlink",
        target: "../../../.ai/.claude/commands/deep/nested.md",
      });
    });

    it("returns empty array when no override files exist", async () => {
      const result = await getOverrideOutputFiles(tempDir, "claudeCode");

      expect(result).toEqual([]);
    });
  });

  describe("applyFileOverrides", () => {
    it("returns generated files when no overrides exist", async () => {
      const files: OutputFile[] = [
        { path: ".claude/settings.json", type: "json", content: {} },
        {
          path: ".claude/CLAUDE.md",
          type: "symlink",
          target: "../.ai/AGENTS.md",
        },
      ];

      const result = await applyFileOverrides(files, tempDir, "claudeCode");

      expect(result).toEqual(files);
    });

    it("replaces generated file with override symlink when paths match", async () => {
      // Create override file
      const overrideDir = path.join(tempDir, ".ai", ".claude");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(
        path.join(overrideDir, "settings.json"),
        '{"custom": true}'
      );

      const files: OutputFile[] = [
        { path: ".claude/settings.json", type: "json", content: {} },
        {
          path: ".claude/CLAUDE.md",
          type: "symlink",
          target: "../.ai/AGENTS.md",
        },
      ];

      const result = await applyFileOverrides(files, tempDir, "claudeCode");

      expect(result).toHaveLength(2);
      // CLAUDE.md should remain unchanged
      expect(result.find((f) => f.path === ".claude/CLAUDE.md")).toEqual({
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      });
      // settings.json should be replaced with override symlink
      expect(result.find((f) => f.path === ".claude/settings.json")).toEqual({
        path: ".claude/settings.json",
        type: "symlink",
        target: "../.ai/.claude/settings.json",
      });
    });

    it("keeps generated files that have no matching override", async () => {
      // Create override file for a different file
      const overrideDir = path.join(tempDir, ".ai", ".claude");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(path.join(overrideDir, "custom.json"), "{}");

      const files: OutputFile[] = [
        { path: ".claude/settings.json", type: "json", content: {} },
      ];

      const result = await applyFileOverrides(files, tempDir, "claudeCode");

      expect(result).toHaveLength(2);
      // Original file should be kept
      expect(result.find((f) => f.path === ".claude/settings.json")).toEqual({
        path: ".claude/settings.json",
        type: "json",
        content: {},
      });
      // Override file should be added
      expect(result.find((f) => f.path === ".claude/custom.json")).toEqual({
        path: ".claude/custom.json",
        type: "symlink",
        target: "../.ai/.claude/custom.json",
      });
    });

    it("handles nested override files correctly", async () => {
      const nestedDir = path.join(tempDir, ".ai", ".claude", "commands");
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, "deploy.md"), "# Deploy");

      const files: OutputFile[] = [
        { path: ".claude/settings.json", type: "json", content: {} },
      ];

      const result = await applyFileOverrides(files, tempDir, "claudeCode");

      expect(result).toHaveLength(2);
      expect(
        result.find((f) => f.path === ".claude/commands/deploy.md")
      ).toEqual({
        path: ".claude/commands/deploy.md",
        type: "symlink",
        target: "../../.ai/.claude/commands/deploy.md",
      });
    });
  });
});
