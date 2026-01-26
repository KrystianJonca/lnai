import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, createTempDir } from "../__tests__/utils";
import {
  CONFIG_DIRS,
  CONFIG_FILES,
  TOOL_IDS,
  type ToolId,
  UNIFIED_DIR,
} from "../constants";
import { ValidationError } from "../errors";
import {
  generateDefaultConfig,
  hasUnifiedConfig,
  initUnifiedConfig,
} from "./index";

describe("hasUnifiedConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("returns false when .ai/ does not exist", async () => {
    const result = await hasUnifiedConfig(tempDir);

    expect(result).toBe(false);
  });

  it("returns true when .ai/ exists", async () => {
    await fs.mkdir(path.join(tempDir, UNIFIED_DIR));

    const result = await hasUnifiedConfig(tempDir);

    expect(result).toBe(true);
  });

  it("returns false when .ai is a file", async () => {
    await fs.writeFile(path.join(tempDir, UNIFIED_DIR), "content");

    const result = await hasUnifiedConfig(tempDir);

    expect(result).toBe(false);
  });
});

describe("generateDefaultConfig", () => {
  it("generates config with all tools enabled by default", () => {
    const config = generateDefaultConfig();

    expect(config.tools).toBeDefined();
    for (const toolId of TOOL_IDS) {
      expect(config.tools?.[toolId]).toEqual({
        enabled: true,
        versionControl: false,
      });
    }
  });

  it("generates config with only specified tools enabled", () => {
    const config = generateDefaultConfig(["claudeCode"]);

    expect(config.tools?.claudeCode).toEqual({
      enabled: true,
      versionControl: false,
    });
    expect(config.tools?.opencode).toEqual({
      enabled: false,
      versionControl: false,
    });
  });

  it("generates config with multiple specified tools", () => {
    const config = generateDefaultConfig(["claudeCode", "opencode"]);

    expect(config.tools?.claudeCode?.enabled).toBe(true);
    expect(config.tools?.opencode?.enabled).toBe(true);
  });

  it("generates config with empty tools array (all disabled)", () => {
    const config = generateDefaultConfig([]);

    for (const toolId of TOOL_IDS) {
      expect(config.tools?.[toolId]?.enabled).toBe(false);
    }
  });

  it("throws ValidationError for invalid tool", () => {
    expect(() => generateDefaultConfig(["invalidTool" as ToolId])).toThrow(
      ValidationError
    );
    expect(() => generateDefaultConfig(["invalidTool" as ToolId])).toThrow(
      /Invalid tool\(s\): invalidTool/
    );
  });
});

describe("initUnifiedConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("creates .ai/ directory", async () => {
    await initUnifiedConfig({ rootDir: tempDir });

    const stats = await fs.stat(path.join(tempDir, UNIFIED_DIR));
    expect(stats.isDirectory()).toBe(true);
  });

  it("creates config.json with default content", async () => {
    await initUnifiedConfig({ rootDir: tempDir });

    const configPath = path.join(tempDir, UNIFIED_DIR, CONFIG_FILES.config);
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);

    expect(config.tools).toBeDefined();
    expect(config.tools.claudeCode.enabled).toBe(true);
    expect(config.tools.opencode.enabled).toBe(true);
  });

  it("creates rules/ and skills/ directories with .gitkeep", async () => {
    await initUnifiedConfig({ rootDir: tempDir });

    const rulesDir = path.join(tempDir, UNIFIED_DIR, CONFIG_DIRS.rules);
    const skillsDir = path.join(tempDir, UNIFIED_DIR, CONFIG_DIRS.skills);

    const rulesStats = await fs.stat(rulesDir);
    const skillsStats = await fs.stat(skillsDir);

    expect(rulesStats.isDirectory()).toBe(true);
    expect(skillsStats.isDirectory()).toBe(true);

    // Check .gitkeep files exist
    await fs.access(path.join(rulesDir, ".gitkeep"));
    await fs.access(path.join(skillsDir, ".gitkeep"));
  });

  it("returns list of created files", async () => {
    const result = await initUnifiedConfig({ rootDir: tempDir });

    expect(result.created).toContain(UNIFIED_DIR);
    expect(result.created).toContain(
      path.join(UNIFIED_DIR, CONFIG_FILES.config)
    );
    expect(result.created).toContain(path.join(UNIFIED_DIR, CONFIG_DIRS.rules));
    expect(result.created).toContain(
      path.join(UNIFIED_DIR, CONFIG_DIRS.skills)
    );
  });

  it("creates minimal config without subdirectories when minimal=true", async () => {
    const result = await initUnifiedConfig({ rootDir: tempDir, minimal: true });

    // Should have .ai/ and config.json
    expect(result.created).toContain(UNIFIED_DIR);
    expect(result.created).toContain(
      path.join(UNIFIED_DIR, CONFIG_FILES.config)
    );

    // Should not have subdirectories
    expect(result.created).not.toContain(
      path.join(UNIFIED_DIR, CONFIG_DIRS.rules)
    );
    expect(result.created).not.toContain(
      path.join(UNIFIED_DIR, CONFIG_DIRS.skills)
    );

    // Verify directories don't exist
    await expect(
      fs.access(path.join(tempDir, UNIFIED_DIR, CONFIG_DIRS.rules))
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(tempDir, UNIFIED_DIR, CONFIG_DIRS.skills))
    ).rejects.toThrow();
  });

  it("enables only specified tools", async () => {
    await initUnifiedConfig({
      rootDir: tempDir,
      tools: ["claudeCode"],
    });

    const configPath = path.join(tempDir, UNIFIED_DIR, CONFIG_FILES.config);
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);

    expect(config.tools.claudeCode.enabled).toBe(true);
    expect(config.tools.opencode.enabled).toBe(false);
  });

  it("creates config.json with proper formatting", async () => {
    await initUnifiedConfig({ rootDir: tempDir });

    const configPath = path.join(tempDir, UNIFIED_DIR, CONFIG_FILES.config);
    const content = await fs.readFile(configPath, "utf-8");

    // Check formatting (2-space indentation, trailing newline)
    expect(content).toContain("  ");
    expect(content.endsWith("\n")).toBe(true);
  });

  it("throws ValidationError for invalid tool", async () => {
    await expect(
      initUnifiedConfig({
        rootDir: tempDir,
        tools: ["invalidTool" as ToolId],
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      initUnifiedConfig({
        rootDir: tempDir,
        tools: ["invalidTool" as ToolId],
      })
    ).rejects.toThrow(/Invalid tool\(s\): invalidTool/);
  });

  it("does not create files when invalid tool provided", async () => {
    await expect(
      initUnifiedConfig({
        rootDir: tempDir,
        tools: ["invalidTool" as ToolId],
      })
    ).rejects.toThrow();

    // Verify .ai directory was not created
    await expect(fs.access(path.join(tempDir, UNIFIED_DIR))).rejects.toThrow();
  });
});
