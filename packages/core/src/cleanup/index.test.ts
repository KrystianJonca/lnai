import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import type { ManifestEntry, OutputFile } from "../types/index";
import {
  cleanupEmptyParentDirs,
  computeFilesToDelete,
  deleteFiles,
} from "./index";

describe("computeFilesToDelete", () => {
  it("returns files that exist in previous but not in current", () => {
    const previousFiles: ManifestEntry[] = [
      { path: ".claude/CLAUDE.md", type: "symlink" },
      { path: ".claude/skills/deploy", type: "symlink" },
      { path: ".claude/settings.json", type: "json" },
    ];

    const currentFiles: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
      { path: ".claude/settings.json", type: "json", content: {} },
    ];

    const result = computeFilesToDelete(previousFiles, currentFiles);

    expect(result).toEqual([".claude/skills/deploy"]);
  });

  it("returns empty array when no files to delete", () => {
    const previousFiles: ManifestEntry[] = [
      { path: ".claude/CLAUDE.md", type: "symlink" },
    ];

    const currentFiles: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ];

    const result = computeFilesToDelete(previousFiles, currentFiles);

    expect(result).toEqual([]);
  });

  it("returns all previous files when current is empty", () => {
    const previousFiles: ManifestEntry[] = [
      { path: ".claude/CLAUDE.md", type: "symlink" },
      { path: ".claude/settings.json", type: "json" },
    ];

    const currentFiles: OutputFile[] = [];

    const result = computeFilesToDelete(previousFiles, currentFiles);

    expect(result).toEqual([".claude/CLAUDE.md", ".claude/settings.json"]);
  });

  it("handles empty previous files", () => {
    const previousFiles: ManifestEntry[] = [];
    const currentFiles: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ];

    const result = computeFilesToDelete(previousFiles, currentFiles);

    expect(result).toEqual([]);
  });
});

describe("deleteFiles", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("deletes files and returns ChangeResults", async () => {
    const claudeDir = path.join(tempDir, ".claude");
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(path.join(claudeDir, "test.json"), "{}", "utf-8");

    const paths = [".claude/test.json"];

    const results = await deleteFiles(paths, tempDir, false);

    expect(results).toEqual([{ path: ".claude/test.json", action: "delete" }]);

    // Verify file was deleted
    await expect(
      fs.access(path.join(claudeDir, "test.json"))
    ).rejects.toThrow();
  });

  it("does not delete files in dry-run mode", async () => {
    const claudeDir = path.join(tempDir, ".claude");
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(path.join(claudeDir, "test.json"), "{}", "utf-8");

    const paths = [".claude/test.json"];

    const results = await deleteFiles(paths, tempDir, true);

    expect(results).toEqual([{ path: ".claude/test.json", action: "delete" }]);

    // Verify file still exists
    await expect(
      fs.access(path.join(claudeDir, "test.json"))
    ).resolves.toBeUndefined();
  });

  it("skips files that do not exist", async () => {
    const paths = [".claude/nonexistent.json"];

    const results = await deleteFiles(paths, tempDir, false);

    expect(results).toEqual([]);
  });

  it("deletes symlinks", async () => {
    const claudeDir = path.join(tempDir, ".claude");
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.symlink("../target", path.join(claudeDir, "link"));

    const paths = [".claude/link"];

    const results = await deleteFiles(paths, tempDir, false);

    expect(results).toEqual([{ path: ".claude/link", action: "delete" }]);

    // Verify symlink was deleted
    await expect(fs.lstat(path.join(claudeDir, "link"))).rejects.toThrow();
  });

  it("cleans up empty parent directories", async () => {
    const nestedDir = path.join(tempDir, ".claude", "skills", "nested");
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(nestedDir, "skill.md"), "content", "utf-8");

    const paths = [".claude/skills/nested/skill.md"];

    await deleteFiles(paths, tempDir, false);

    // Verify file was deleted
    await expect(fs.access(path.join(nestedDir, "skill.md"))).rejects.toThrow();

    // Verify empty directories were cleaned up
    await expect(fs.access(nestedDir)).rejects.toThrow();
    await expect(
      fs.access(path.join(tempDir, ".claude", "skills"))
    ).rejects.toThrow();
    // .claude should still exist as it's immediately under rootDir
    await expect(fs.access(path.join(tempDir, ".claude"))).rejects.toThrow();
  });

  it("handles multiple files", async () => {
    const claudeDir = path.join(tempDir, ".claude");
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(path.join(claudeDir, "file1.json"), "{}", "utf-8");
    await fs.writeFile(path.join(claudeDir, "file2.json"), "{}", "utf-8");

    const paths = [".claude/file1.json", ".claude/file2.json"];

    const results = await deleteFiles(paths, tempDir, false);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.action === "delete")).toBe(true);
  });
});

describe("cleanupEmptyParentDirs", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("removes empty parent directories", async () => {
    const nestedDir = path.join(tempDir, "a", "b", "c");
    await fs.mkdir(nestedDir, { recursive: true });
    const filePath = path.join(nestedDir, "file.txt");

    // Simulate file already deleted, just clean up parents
    await cleanupEmptyParentDirs(filePath, tempDir);

    // All empty directories should be removed
    await expect(fs.access(path.join(tempDir, "a"))).rejects.toThrow();
  });

  it("stops at non-empty directories", async () => {
    const dir = path.join(tempDir, "a", "b");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "a", "other.txt"),
      "content",
      "utf-8"
    );

    const filePath = path.join(dir, "file.txt");

    await cleanupEmptyParentDirs(filePath, tempDir);

    // a/b should be removed, but a should remain (has other.txt)
    await expect(fs.access(dir)).rejects.toThrow();
    await expect(fs.access(path.join(tempDir, "a"))).resolves.toBeUndefined();
  });

  it("does not remove root directory", async () => {
    const dir = path.join(tempDir, "only-child");
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, "file.txt");

    await cleanupEmptyParentDirs(filePath, tempDir);

    // only-child should be removed, but tempDir should remain
    await expect(fs.access(dir)).rejects.toThrow();
    await expect(fs.access(tempDir)).resolves.toBeUndefined();
  });

  it("handles non-existent directories gracefully", async () => {
    const filePath = path.join(tempDir, "nonexistent", "dir", "file.txt");

    // Should not throw
    await expect(
      cleanupEmptyParentDirs(filePath, tempDir)
    ).resolves.toBeUndefined();
  });

  it("does not traverse outside root when paths have similar prefixes", async () => {
    // Create /tmp/foo (root) and /tmp/foobar (similar prefix, outside root)
    const rootDir = await createTempDir("prefix-test-");
    const similarDir = rootDir + "bar"; // e.g., /tmp/prefix-test-abc + bar

    await fs.mkdir(similarDir, { recursive: true });
    await fs.mkdir(path.join(rootDir, "subdir"), { recursive: true });

    // File path is conceptually in rootDir/subdir/file.txt
    const filePath = path.join(rootDir, "subdir", "file.txt");

    await cleanupEmptyParentDirs(filePath, rootDir);

    // subdir should be removed (empty, inside root)
    await expect(fs.access(path.join(rootDir, "subdir"))).rejects.toThrow();
    // similarDir should NOT be touched
    await expect(fs.access(similarDir)).resolves.toBeUndefined();

    // Cleanup
    await cleanupTempDir(rootDir);
    await cleanupTempDir(similarDir);
  });
});
