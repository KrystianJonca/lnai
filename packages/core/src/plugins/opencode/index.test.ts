import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createFullState,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { opencodePlugin } from "./index";

describe("opencodePlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(opencodePlugin.id).toBe("opencode");
      expect(opencodePlugin.name).toBe("OpenCode");
    });
  });

  describe("export", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("creates AGENTS.md symlink when agents exists", async () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const files = await opencodePlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === ".opencode/AGENTS.md");
      expect(agentsMd).toBeDefined();
      expect(agentsMd?.type).toBe("symlink");
      expect(agentsMd?.target).toBe("../.ai/AGENTS.md");
    });

    it("skips AGENTS.md symlink when no agents", async () => {
      const state = createMinimalState({ agents: null });

      const files = await opencodePlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === ".opencode/AGENTS.md");
      expect(agentsMd).toBeUndefined();
    });

    it("creates rules symlink when rules exist", async () => {
      const state = createMinimalState({
        rules: [
          { path: "rule.md", frontmatter: { paths: ["*.ts"] }, content: "" },
        ],
      });

      const files = await opencodePlugin.export(state, tempDir);

      const rules = files.find((f) => f.path === ".opencode/rules");
      expect(rules).toBeDefined();
      expect(rules?.type).toBe("symlink");
      expect(rules?.target).toBe("../.ai/rules");
    });

    it("skips rules symlink when no rules", async () => {
      const state = createMinimalState({ rules: [] });

      const files = await opencodePlugin.export(state, tempDir);

      const rules = files.find((f) => f.path === ".opencode/rules");
      expect(rules).toBeUndefined();
    });

    it("creates skill symlinks for each skill", async () => {
      const state = createMinimalState({
        skills: [
          {
            path: "deploy",
            frontmatter: { name: "deploy", description: "Deploy" },
            content: "",
          },
          {
            path: "test",
            frontmatter: { name: "test", description: "Test" },
            content: "",
          },
        ],
      });

      const files = await opencodePlugin.export(state, tempDir);

      const deploySkill = files.find(
        (f) => f.path === ".opencode/skills/deploy"
      );
      const testSkill = files.find((f) => f.path === ".opencode/skills/test");

      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");

      expect(testSkill).toBeDefined();
      expect(testSkill?.type).toBe("symlink");
      expect(testSkill?.target).toBe("../../.ai/skills/test");
    });

    it("always creates opencode.json", async () => {
      const state = createMinimalState();

      const files = await opencodePlugin.export(state, tempDir);

      const config = files.find((f) => f.path === "opencode.json");
      expect(config).toBeDefined();
      expect(config?.type).toBe("json");
      expect((config?.content as Record<string, unknown>)["$schema"]).toBe(
        "https://opencode.ai/config.json"
      );
    });

    it("adds instructions when rules exist", async () => {
      const state = createMinimalState({
        rules: [
          { path: "rule.md", frontmatter: { paths: ["*.ts"] }, content: "" },
        ],
      });

      const files = await opencodePlugin.export(state, tempDir);

      const config = files.find((f) => f.path === "opencode.json");
      expect(
        (config?.content as Record<string, unknown>)["instructions"]
      ).toEqual([".opencode/rules/*.md"]);
    });

    it("transforms and adds MCP servers", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            db: {
              command: "npx",
              args: ["-y", "@example/db"],
              env: { DB_URL: "${DB_URL}" },
            },
          },
        },
      });

      const files = await opencodePlugin.export(state, tempDir);

      const config = files.find((f) => f.path === "opencode.json");
      const content = config?.content as Record<string, unknown>;
      const mcp = content["mcp"] as Record<string, Record<string, unknown>>;
      expect(mcp).toBeDefined();
      expect(mcp["db"]?.["type"]).toBe("local");
      expect(mcp["db"]?.["command"]).toEqual(["npx", "-y", "@example/db"]);
    });

    it("transforms and adds permissions", async () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
            deny: ["Read(.env)"],
          },
        },
      });

      const files = await opencodePlugin.export(state, tempDir);

      const config = files.find((f) => f.path === "opencode.json");
      expect(
        (config?.content as Record<string, unknown>)["permission"]
      ).toBeDefined();
    });

    it("exports full state correctly", async () => {
      const state = createFullState();

      const files = await opencodePlugin.export(state, tempDir);

      // Should have AGENTS.md, rules, skills, and opencode.json
      expect(files.find((f) => f.path === ".opencode/AGENTS.md")).toBeDefined();
      expect(files.find((f) => f.path === ".opencode/rules")).toBeDefined();
      expect(
        files.find((f) => f.path === ".opencode/skills/deploy")
      ).toBeDefined();
      expect(files.find((f) => f.path === "opencode.json")).toBeDefined();
    });

    describe("JSON overrides", () => {
      it("deep merges settings from state.settings.overrides.opencode", async () => {
        const state = createMinimalState({
          settings: {
            permissions: { allow: ["Bash(git:*)"] },
            overrides: {
              opencode: {
                theme: "dark",
                experimental: { feature1: true },
              },
            },
          },
        });

        const files = await opencodePlugin.export(state, tempDir);

        const config = files.find((f) => f.path === "opencode.json");
        expect(config).toBeDefined();
        const content = config?.content as Record<string, unknown>;
        expect(content["theme"]).toBe("dark");
        expect(content["experimental"]).toEqual({ feature1: true });
        expect(content["$schema"]).toBe("https://opencode.ai/config.json");
      });

      it("does not include overrides from other tools", async () => {
        const state = createMinimalState({
          settings: {
            permissions: { allow: ["Bash(git:*)"] },
            overrides: {
              claudeCode: { model: "opus" },
              opencode: { theme: "dark" },
            },
          },
        });

        const files = await opencodePlugin.export(state, tempDir);

        const config = files.find((f) => f.path === "opencode.json");
        expect(config).toBeDefined();
        const content = config?.content as Record<string, unknown>;
        expect(content["theme"]).toBe("dark");
        expect(content["model"]).toBeUndefined();
      });
    });

    describe("file symlinks", () => {
      it("creates symlinks for other override files", async () => {
        // Create override directory with files
        const customDir = path.join(tempDir, ".ai", ".opencode", "custom");
        await fs.mkdir(customDir, { recursive: true });
        await fs.writeFile(
          path.join(customDir, "config.md"),
          "# Custom Config"
        );

        const state = createMinimalState();

        const files = await opencodePlugin.export(state, tempDir);

        const customConfig = files.find(
          (f) => f.path === ".opencode/custom/config.md"
        );
        expect(customConfig).toBeDefined();
        expect(customConfig?.type).toBe("symlink");
        expect(customConfig?.target).toBe("../.ai/.opencode/custom/config.md");
      });

      it("does not create symlink if target file already exists", async () => {
        // Create override file
        const overrideDir = path.join(tempDir, ".ai", ".opencode", "custom");
        await fs.mkdir(overrideDir, { recursive: true });
        await fs.writeFile(path.join(overrideDir, "existing.md"), "# Override");

        // Create existing file at target location
        const targetDir = path.join(tempDir, ".opencode", "custom");
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, "existing.md"), "# Existing");

        const state = createMinimalState();

        const files = await opencodePlugin.export(state, tempDir);

        const existingFile = files.find(
          (f) => f.path === ".opencode/custom/existing.md"
        );
        expect(existingFile).toBeUndefined();
      });

      it("handles nested override directories", async () => {
        // Create nested override structure
        const nestedDir = path.join(
          tempDir,
          ".ai",
          ".opencode",
          "deep",
          "nested"
        );
        await fs.mkdir(nestedDir, { recursive: true });
        await fs.writeFile(path.join(nestedDir, "file.md"), "# Nested File");

        const state = createMinimalState();

        const files = await opencodePlugin.export(state, tempDir);

        const nestedFile = files.find(
          (f) => f.path === ".opencode/deep/nested/file.md"
        );
        expect(nestedFile).toBeDefined();
        expect(nestedFile?.type).toBe("symlink");
        expect(nestedFile?.target).toBe("../.ai/.opencode/deep/nested/file.md");
      });
    });
  });

  describe("validate", () => {
    it("returns valid true for full state", () => {
      const state = createFullState();

      const result = opencodePlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns warning when agents is missing", () => {
      const state = createMinimalState({ agents: null });

      const result = opencodePlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain("AGENTS.md");
    });

    it("no warning when agents exists", () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const result = opencodePlugin.validate(state);

      expect(result.warnings).toHaveLength(0);
    });

    it("no skipped when no hooks", () => {
      const state = createMinimalState();

      const result = opencodePlugin.validate(state);

      expect(result.skipped).toHaveLength(0);
    });
  });
});
