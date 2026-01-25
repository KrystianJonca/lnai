import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import type { OutputFile } from "../types/index";
import { computeHash, updateGitignore, writeFiles } from "./index";

describe("computeHash", () => {
  it("returns SHA256 hex string", () => {
    const hash = computeHash("hello world");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns same hash for same content", () => {
    const content = "test content";

    expect(computeHash(content)).toBe(computeHash(content));
  });

  it("returns different hash for different content", () => {
    expect(computeHash("content a")).not.toBe(computeHash("content b"));
  });

  it("handles empty string", () => {
    const hash = computeHash("");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles unicode content", () => {
    const hash = computeHash("Hello \u{1F600} World");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("writeFiles", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("creates JSON file with formatting", async () => {
    const files: OutputFile[] = [
      {
        path: "output/settings.json",
        type: "json",
        content: { key: "value", nested: { a: 1 } },
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");

    const content = await fs.readFile(
      path.join(tempDir, "output/settings.json"),
      "utf-8"
    );
    expect(content).toBe(
      '{\n  "key": "value",\n  "nested": {\n    "a": 1\n  }\n}\n'
    );
  });

  it("creates text file", async () => {
    const files: OutputFile[] = [
      {
        path: "readme.txt",
        type: "text",
        content: "Hello World",
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");

    const content = await fs.readFile(
      path.join(tempDir, "readme.txt"),
      "utf-8"
    );
    expect(content).toBe("Hello World");
  });

  it("creates symlink to target", async () => {
    // First create the target
    const targetDir = path.join(tempDir, "source");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, "file.txt"), "content");

    const files: OutputFile[] = [
      {
        path: "link",
        type: "symlink",
        target: "source",
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");

    const linkPath = path.join(tempDir, "link");
    const stats = await fs.lstat(linkPath);
    expect(stats.isSymbolicLink()).toBe(true);

    const target = await fs.readlink(linkPath);
    expect(target).toBe("source");
  });

  it("detects unchanged file", async () => {
    // Create existing file
    const filePath = path.join(tempDir, "existing.json");
    const content = '{\n  "key": "value"\n}\n';
    await fs.writeFile(filePath, content, "utf-8");

    const files: OutputFile[] = [
      {
        path: "existing.json",
        type: "json",
        content: { key: "value" },
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("unchanged");
    expect(results[0]?.oldHash).toBe(results[0]?.newHash);
  });

  it("detects updated file", async () => {
    // Create existing file with different content
    const filePath = path.join(tempDir, "existing.json");
    await fs.writeFile(filePath, '{\n  "old": "value"\n}\n', "utf-8");

    const files: OutputFile[] = [
      {
        path: "existing.json",
        type: "json",
        content: { new: "value" },
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("update");
    expect(results[0]?.oldHash).not.toBe(results[0]?.newHash);
  });

  it("detects new file", async () => {
    const files: OutputFile[] = [
      {
        path: "new-file.txt",
        type: "text",
        content: "content",
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");
    expect(results[0]?.oldHash).toBeUndefined();
    expect(results[0]?.newHash).toBeDefined();
  });

  it("does not write when dryRun is true", async () => {
    const files: OutputFile[] = [
      {
        path: "should-not-exist.json",
        type: "json",
        content: { key: "value" },
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir, dryRun: true });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");

    // File should not exist
    await expect(
      fs.access(path.join(tempDir, "should-not-exist.json"))
    ).rejects.toThrow();
  });

  it("creates nested directories", async () => {
    const files: OutputFile[] = [
      {
        path: "deep/nested/path/file.json",
        type: "json",
        content: { nested: true },
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("create");

    const content = await fs.readFile(
      path.join(tempDir, "deep/nested/path/file.json"),
      "utf-8"
    );
    expect(JSON.parse(content)).toEqual({ nested: true });
  });

  it("handles multiple files", async () => {
    const files: OutputFile[] = [
      { path: "file1.json", type: "json", content: { a: 1 } },
      { path: "file2.txt", type: "text", content: "text" },
      { path: "dir/file3.json", type: "json", content: { b: 2 } },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.action === "create")).toBe(true);
  });

  it("detects unchanged symlink", async () => {
    // Create existing symlink
    const linkPath = path.join(tempDir, "link");
    await fs.symlink("target", linkPath);

    const files: OutputFile[] = [
      {
        path: "link",
        type: "symlink",
        target: "target",
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("unchanged");
  });

  it("updates symlink with different target", async () => {
    // Create existing symlink with different target
    const linkPath = path.join(tempDir, "link");
    await fs.symlink("old-target", linkPath);

    const files: OutputFile[] = [
      {
        path: "link",
        type: "symlink",
        target: "new-target",
      },
    ];

    const results = await writeFiles(files, { rootDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe("update");

    const newTarget = await fs.readlink(linkPath);
    expect(newTarget).toBe("new-target");
  });
});

describe("updateGitignore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("creates new .gitignore with markers", async () => {
    await updateGitignore(tempDir, [".claude/", "opencode.json"]);

    const content = await fs.readFile(
      path.join(tempDir, ".gitignore"),
      "utf-8"
    );

    expect(content).toContain("# lnai-generated");
    expect(content).toContain("# end lnai-generated");
    expect(content).toContain(".claude/");
    expect(content).toContain("opencode.json");
  });

  it("adds to existing .gitignore", async () => {
    // Create existing .gitignore
    await fs.writeFile(
      path.join(tempDir, ".gitignore"),
      "node_modules/\n.env\n",
      "utf-8"
    );

    await updateGitignore(tempDir, [".claude/"]);

    const content = await fs.readFile(
      path.join(tempDir, ".gitignore"),
      "utf-8"
    );

    expect(content).toContain("node_modules/");
    expect(content).toContain(".env");
    expect(content).toContain("# lnai-generated");
    expect(content).toContain(".claude/");
  });

  it("replaces existing lnai-generated section", async () => {
    // Create .gitignore with existing lnai section
    await fs.writeFile(
      path.join(tempDir, ".gitignore"),
      `node_modules/
# lnai-generated
.old-claude/
# end lnai-generated
.env`,
      "utf-8"
    );

    await updateGitignore(tempDir, [".new-claude/"]);

    const content = await fs.readFile(
      path.join(tempDir, ".gitignore"),
      "utf-8"
    );

    expect(content).toContain("node_modules/");
    expect(content).toContain(".env");
    expect(content).toContain(".new-claude/");
    expect(content).not.toContain(".old-claude/");
    // Should only have one lnai section
    expect(content.split("# lnai-generated").length).toBe(2);
  });

  it("preserves other content", async () => {
    await fs.writeFile(
      path.join(tempDir, ".gitignore"),
      `# Build output
dist/
build/

# Dependencies
node_modules/

# Environment
.env
.env.local`,
      "utf-8"
    );

    await updateGitignore(tempDir, [".claude/"]);

    const content = await fs.readFile(
      path.join(tempDir, ".gitignore"),
      "utf-8"
    );

    expect(content).toContain("# Build output");
    expect(content).toContain("dist/");
    expect(content).toContain("# Dependencies");
    expect(content).toContain("node_modules/");
    expect(content).toContain("# Environment");
    expect(content).toContain(".env.local");
    expect(content).toContain(".claude/");
  });

  it("handles empty paths array", async () => {
    await updateGitignore(tempDir, []);

    const content = await fs.readFile(
      path.join(tempDir, ".gitignore"),
      "utf-8"
    );

    expect(content).toContain("# lnai-generated");
    expect(content).toContain("# end lnai-generated");
  });
});
