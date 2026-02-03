import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import { UNIFIED_DIR } from "../constants";
import type { LnaiManifest, OutputFile } from "../types/index";
import {
  buildToolManifest,
  createEmptyManifest,
  MANIFEST_FILENAME,
  readManifest,
  updateToolManifest,
  writeManifest,
} from "./index";

describe("readManifest", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.mkdir(path.join(tempDir, UNIFIED_DIR), { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("returns null when manifest does not exist", async () => {
    const result = await readManifest(tempDir);

    expect(result).toBeNull();
  });

  it("reads existing manifest", async () => {
    const manifest: LnaiManifest = {
      version: 1,
      tools: {
        claudeCode: {
          version: 1,
          tool: "claudeCode",
          generatedAt: "2024-01-01T00:00:00.000Z",
          files: [
            {
              path: ".claude/CLAUDE.md",
              type: "symlink",
              target: "../.ai/AGENTS.md",
            },
          ],
        },
      },
    };

    await fs.writeFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      JSON.stringify(manifest, null, 2),
      "utf-8"
    );

    const result = await readManifest(tempDir);

    expect(result).toEqual(manifest);
  });

  it("returns null for invalid JSON", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await fs.writeFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      "invalid json {",
      "utf-8"
    );

    const result = await readManifest(tempDir);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read manifest")
    );

    consoleSpy.mockRestore();
  });

  it("returns null for unknown version", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const manifest = {
      version: 99,
      tools: {},
    };

    await fs.writeFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      JSON.stringify(manifest),
      "utf-8"
    );

    const result = await readManifest(tempDir);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown manifest version 99")
    );

    consoleSpy.mockRestore();
  });
});

describe("writeManifest", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.mkdir(path.join(tempDir, UNIFIED_DIR), { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("writes manifest to .ai directory", async () => {
    const manifest: LnaiManifest = {
      version: 1,
      tools: {
        claudeCode: {
          version: 1,
          tool: "claudeCode",
          generatedAt: "2024-01-01T00:00:00.000Z",
          files: [],
        },
      },
    };

    await writeManifest(tempDir, manifest);

    const content = await fs.readFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      "utf-8"
    );
    expect(JSON.parse(content)).toEqual(manifest);
  });

  it("overwrites existing manifest", async () => {
    const oldManifest: LnaiManifest = {
      version: 1,
      tools: {},
    };

    await fs.writeFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      JSON.stringify(oldManifest),
      "utf-8"
    );

    const newManifest: LnaiManifest = {
      version: 1,
      tools: {
        cursor: {
          version: 1,
          tool: "cursor",
          generatedAt: "2024-01-01T00:00:00.000Z",
          files: [
            { path: ".cursor/rules/test.mdc", type: "text", hash: "abc123" },
          ],
        },
      },
    };

    await writeManifest(tempDir, newManifest);

    const content = await fs.readFile(
      path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME),
      "utf-8"
    );
    expect(JSON.parse(content)).toEqual(newManifest);
  });
});

describe("buildToolManifest", () => {
  it("creates manifest entry for symlink files", () => {
    const files: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ];

    const result = buildToolManifest("claudeCode", files);

    expect(result.version).toBe(1);
    expect(result.tool).toBe("claudeCode");
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.files).toEqual([
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ]);
  });

  it("creates manifest entry for JSON files with hash", () => {
    const files: OutputFile[] = [
      {
        path: ".claude/settings.json",
        type: "json",
        content: { key: "value" },
      },
    ];

    const result = buildToolManifest("claudeCode", files);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.type).toBe("json");
    expect(result.files[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.files[0]?.target).toBeUndefined();
  });

  it("creates manifest entry for text files with hash", () => {
    const files: OutputFile[] = [
      {
        path: ".cursor/rules/test.mdc",
        type: "text",
        content: "# Test Rule",
      },
    ];

    const result = buildToolManifest("cursor", files);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.type).toBe("text");
    expect(result.files[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles multiple files", () => {
    const files: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
      { path: ".claude/settings.json", type: "json", content: {} },
      {
        path: ".claude/skills/deploy",
        type: "symlink",
        target: "../../.ai/skills/deploy",
      },
    ];

    const result = buildToolManifest("claudeCode", files);

    expect(result.files).toHaveLength(3);
  });
});

describe("updateToolManifest", () => {
  it("adds new tool to empty manifest", () => {
    const manifest = createEmptyManifest();
    const files: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ];

    const result = updateToolManifest(manifest, "claudeCode", files);

    expect(result.tools.claudeCode).toBeDefined();
    expect(result.tools.claudeCode?.files).toHaveLength(1);
  });

  it("updates existing tool in manifest", () => {
    const manifest: LnaiManifest = {
      version: 1,
      tools: {
        claudeCode: {
          version: 1,
          tool: "claudeCode",
          generatedAt: "2024-01-01T00:00:00.000Z",
          files: [{ path: "old-file.md", type: "text" }],
        },
      },
    };

    const files: OutputFile[] = [
      { path: "new-file.md", type: "text", content: "content" },
    ];

    const result = updateToolManifest(manifest, "claudeCode", files);

    expect(result.tools.claudeCode?.files).toHaveLength(1);
    expect(result.tools.claudeCode?.files[0]?.path).toBe("new-file.md");
  });

  it("preserves other tools in manifest", () => {
    const manifest: LnaiManifest = {
      version: 1,
      tools: {
        cursor: {
          version: 1,
          tool: "cursor",
          generatedAt: "2024-01-01T00:00:00.000Z",
          files: [{ path: ".cursor/rules/test.mdc", type: "text" }],
        },
      },
    };

    const files: OutputFile[] = [
      {
        path: ".claude/CLAUDE.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      },
    ];

    const result = updateToolManifest(manifest, "claudeCode", files);

    expect(result.tools.cursor).toBeDefined();
    expect(result.tools.claudeCode).toBeDefined();
  });
});

describe("createEmptyManifest", () => {
  it("creates manifest with version 1", () => {
    const result = createEmptyManifest();

    expect(result.version).toBe(1);
    expect(result.tools).toEqual({});
  });
});
