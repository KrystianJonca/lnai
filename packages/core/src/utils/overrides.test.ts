import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import {
  deepMergeConfigs,
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

  describe("deepMergeConfigs", () => {
    it("merges simple objects", () => {
      const base = { a: 1, b: 2 };
      const override = { b: 3, c: 4 };

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("deep merges nested objects", () => {
      const base = { nested: { a: 1, b: 2 } };
      const override = { nested: { b: 3, c: 4 } };

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
    });

    it("concatenates arrays and deduplicates", () => {
      const base = { items: [1, 2, 3] };
      const override = { items: [3, 4, 5] };

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({ items: [1, 2, 3, 4, 5] });
    });

    it("deduplicates string arrays", () => {
      const base = { permissions: ["Bash(git:*)", "Read(.env)"] };
      const override = { permissions: ["Bash(git:*)", "Bash(npm:*)"] };

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({
        permissions: ["Bash(git:*)", "Read(.env)", "Bash(npm:*)"],
      });
    });

    it("does not modify original objects", () => {
      const base = { a: 1 };
      const override = { b: 2 };

      deepMergeConfigs(base, override);

      expect(base).toEqual({ a: 1 });
      expect(override).toEqual({ b: 2 });
    });

    it("handles empty base object", () => {
      const base = {};
      const override = { a: 1 };

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({ a: 1 });
    });

    it("handles empty override object", () => {
      const base = { a: 1 };
      const override = {};

      const result = deepMergeConfigs(base, override);

      expect(result).toEqual({ a: 1 });
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
      const nestedDir = path.join(tempDir, ".ai", ".claude", "commands", "deep");
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

    it("skips files that already exist at target location", async () => {
      const overrideDir = path.join(tempDir, ".ai", ".claude");
      await fs.mkdir(overrideDir, { recursive: true });
      await fs.writeFile(path.join(overrideDir, "existing.json"), "{}");

      // Create the target file so it should be skipped
      const targetDir = path.join(tempDir, ".claude");
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, "existing.json"), "{}");

      const result = await getOverrideOutputFiles(tempDir, "claudeCode");

      expect(result).toHaveLength(0);
    });

    it("returns empty array when no override files exist", async () => {
      const result = await getOverrideOutputFiles(tempDir, "claudeCode");

      expect(result).toEqual([]);
    });
  });
});
