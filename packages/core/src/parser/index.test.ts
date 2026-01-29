import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, copyFixture, createTempDir } from "../__tests__/utils";
import { FileNotFoundError, ParseError } from "../errors";
import { parseUnifiedConfig } from "./index";

describe("parseUnifiedConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("parses minimal .ai/ with just config.json", async () => {
    await copyFixture("valid/minimal", tempDir);

    const state = await parseUnifiedConfig(tempDir);

    expect(state.config.tools?.claudeCode?.enabled).toBe(true);
    expect(state.settings).toBeNull();
    expect(state.agents).toBeNull();
    expect(state.rules).toEqual([]);
    expect(state.skills).toEqual([]);
  });

  it("parses full .ai/ with all features", async () => {
    await copyFixture("valid/full", tempDir);

    const state = await parseUnifiedConfig(tempDir);

    // Config
    expect(state.config.tools?.claudeCode?.enabled).toBe(true);
    expect(state.config.tools?.claudeCode?.versionControl).toBe(false);
    expect(state.config.tools?.opencode?.enabled).toBe(true);

    // Settings
    expect(state.settings).not.toBeNull();
    expect(state.settings?.permissions?.allow).toContain("Bash(git:*)");
    expect(state.settings?.mcpServers?.["db"]).toBeDefined();

    // Agents
    expect(state.agents).toContain("# Project Instructions");

    // Rules
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]?.path).toBe("example.md");
    expect(state.rules[0]?.frontmatter.paths).toContain("src/**/*.ts");
    expect(state.rules[0]?.content).toContain("# TypeScript Rules");

    // Skills
    expect(state.skills).toHaveLength(1);
    expect(state.skills[0]?.path).toBe("deploy");
    expect(state.skills[0]?.frontmatter.name).toBe("deploy");
    expect(state.skills[0]?.frontmatter.description).toBe(
      "Deploy the application to production"
    );
  });

  it("throws FileNotFoundError when .ai/ is missing", async () => {
    await expect(parseUnifiedConfig(tempDir)).rejects.toThrow(
      FileNotFoundError
    );
  });

  it("returns default empty config when config.json is missing", async () => {
    // Create .ai/ directory without config.json
    const aiDir = path.join(tempDir, ".ai");
    await fs.mkdir(aiDir, { recursive: true });

    const state = await parseUnifiedConfig(tempDir);

    expect(state.config).toEqual({ tools: {} });
  });

  it("throws ParseError for malformed JSON", async () => {
    const aiDir = path.join(tempDir, ".ai");
    await fs.mkdir(aiDir, { recursive: true });

    // Write malformed JSON
    await fs.writeFile(
      path.join(aiDir, "config.json"),
      '{ "tools": { invalid json } }',
      "utf-8"
    );

    await expect(parseUnifiedConfig(tempDir)).rejects.toThrow(ParseError);
  });

  it("reads all .md files from rules/ directory", async () => {
    const aiDir = path.join(tempDir, ".ai");
    const rulesDir = path.join(aiDir, "rules");
    await fs.mkdir(rulesDir, { recursive: true });

    // Create config
    await fs.writeFile(
      path.join(aiDir, "config.json"),
      JSON.stringify({ tools: {} }),
      "utf-8"
    );

    // Create multiple rules
    await fs.writeFile(
      path.join(rulesDir, "rule1.md"),
      "---\npaths:\n  - src/*.ts\n---\n# Rule 1",
      "utf-8"
    );
    await fs.writeFile(
      path.join(rulesDir, "rule2.md"),
      "---\npaths:\n  - lib/*.ts\n---\n# Rule 2",
      "utf-8"
    );
    await fs.writeFile(
      path.join(rulesDir, "ignore.txt"),
      "Not a markdown file",
      "utf-8"
    );

    const state = await parseUnifiedConfig(tempDir);

    expect(state.rules).toHaveLength(2);
    expect(state.rules.map((r) => r.path).sort()).toEqual([
      "rule1.md",
      "rule2.md",
    ]);
  });

  it("reads SKILL.md from each skill subdirectory", async () => {
    const aiDir = path.join(tempDir, ".ai");
    const skillsDir = path.join(aiDir, "skills");
    await fs.mkdir(skillsDir, { recursive: true });

    // Create config
    await fs.writeFile(
      path.join(aiDir, "config.json"),
      JSON.stringify({ tools: {} }),
      "utf-8"
    );

    // Create skill directories
    const deployDir = path.join(skillsDir, "deploy");
    const testDir = path.join(skillsDir, "test");
    const emptyDir = path.join(skillsDir, "empty");
    await fs.mkdir(deployDir, { recursive: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(emptyDir, { recursive: true });

    await fs.writeFile(
      path.join(deployDir, "SKILL.md"),
      "---\nname: deploy\ndescription: Deploy app\n---\n# Deploy",
      "utf-8"
    );
    await fs.writeFile(
      path.join(testDir, "SKILL.md"),
      "---\nname: test\ndescription: Run tests\n---\n# Test",
      "utf-8"
    );
    // emptyDir has no SKILL.md - should be skipped

    const state = await parseUnifiedConfig(tempDir);

    expect(state.skills).toHaveLength(2);
    expect(state.skills.map((s) => s.path).sort()).toEqual(["deploy", "test"]);
  });

  it("works without optional files (settings.json, AGENTS.md)", async () => {
    const aiDir = path.join(tempDir, ".ai");
    await fs.mkdir(aiDir, { recursive: true });

    // Only create config.json
    await fs.writeFile(
      path.join(aiDir, "config.json"),
      JSON.stringify({ tools: { claudeCode: { enabled: true } } }),
      "utf-8"
    );

    const state = await parseUnifiedConfig(tempDir);

    expect(state.config.tools?.claudeCode?.enabled).toBe(true);
    expect(state.settings).toBeNull();
    expect(state.agents).toBeNull();
  });

  it("parses config with permissions", async () => {
    await copyFixture("valid/with-overrides", tempDir);

    const state = await parseUnifiedConfig(tempDir);

    // Settings should be parsed
    expect(state.settings?.permissions?.allow).toContain("Bash(git:*)");
    expect(state.config.tools?.claudeCode?.enabled).toBe(true);
    expect(state.config.tools?.opencode?.enabled).toBe(true);
  });

  it("handles empty rules directory", async () => {
    const aiDir = path.join(tempDir, ".ai");
    const rulesDir = path.join(aiDir, "rules");
    await fs.mkdir(rulesDir, { recursive: true });

    await fs.writeFile(
      path.join(aiDir, "config.json"),
      JSON.stringify({ tools: {} }),
      "utf-8"
    );

    const state = await parseUnifiedConfig(tempDir);

    expect(state.rules).toEqual([]);
  });

  it("handles missing rules directory", async () => {
    const aiDir = path.join(tempDir, ".ai");
    await fs.mkdir(aiDir, { recursive: true });

    await fs.writeFile(
      path.join(aiDir, "config.json"),
      JSON.stringify({ tools: {} }),
      "utf-8"
    );

    const state = await parseUnifiedConfig(tempDir);

    expect(state.rules).toEqual([]);
  });
});
