import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createFullState,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { claudeCodePlugin } from "./index";

describe("claudeCodePlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(claudeCodePlugin.id).toBe("claudeCode");
      expect(claudeCodePlugin.name).toBe("Claude Code");
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

    it("creates CLAUDE.md symlink when agents exists", async () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const files = await claudeCodePlugin.export(state, tempDir);

      const claudeMd = files.find((f) => f.path === ".claude/CLAUDE.md");
      expect(claudeMd).toBeDefined();
      expect(claudeMd?.type).toBe("symlink");
      expect(claudeMd?.target).toBe("../.ai/AGENTS.md");
    });

    it("skips CLAUDE.md symlink when no agents", async () => {
      const state = createMinimalState({ agents: null });

      const files = await claudeCodePlugin.export(state, tempDir);

      const claudeMd = files.find((f) => f.path === ".claude/CLAUDE.md");
      expect(claudeMd).toBeUndefined();
    });

    it("creates rules symlink when rules exist", async () => {
      const state = createMinimalState({
        rules: [
          { path: "rule.md", frontmatter: { paths: ["*.ts"] }, content: "" },
        ],
      });

      const files = await claudeCodePlugin.export(state, tempDir);

      const rules = files.find((f) => f.path === ".claude/rules");
      expect(rules).toBeDefined();
      expect(rules?.type).toBe("symlink");
      expect(rules?.target).toBe("../.ai/rules");
    });

    it("skips rules symlink when no rules", async () => {
      const state = createMinimalState({ rules: [] });

      const files = await claudeCodePlugin.export(state, tempDir);

      const rules = files.find((f) => f.path === ".claude/rules");
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

      const files = await claudeCodePlugin.export(state, tempDir);

      const deploySkill = files.find((f) => f.path === ".claude/skills/deploy");
      const testSkill = files.find((f) => f.path === ".claude/skills/test");

      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");

      expect(testSkill).toBeDefined();
      expect(testSkill?.type).toBe("symlink");
      expect(testSkill?.target).toBe("../../.ai/skills/test");
    });

    it("creates settings.json with permissions", async () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
            deny: ["Read(.env)"],
          },
        },
      });

      const files = await claudeCodePlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();
      expect(settings?.type).toBe("json");
      expect(
        (settings?.content as Record<string, unknown>)["permissions"]
      ).toEqual({
        allow: ["Bash(git:*)"],
        deny: ["Read(.env)"],
      });
    });

    it("creates settings.json with mcpServers", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            db: { command: "npx", args: ["-y", "@example/db"] },
          },
        },
      });

      const files = await claudeCodePlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();
      expect(
        (settings?.content as Record<string, unknown>)["mcpServers"]
      ).toBeDefined();
    });

    it("skips settings.json when no settings content", async () => {
      const state = createMinimalState({ settings: {} });

      const files = await claudeCodePlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeUndefined();
    });

    it("exports full state correctly", async () => {
      const state = createFullState();

      const files = await claudeCodePlugin.export(state, tempDir);

      // Should have CLAUDE.md, rules, skills, and settings
      expect(files.find((f) => f.path === ".claude/CLAUDE.md")).toBeDefined();
      expect(files.find((f) => f.path === ".claude/rules")).toBeDefined();
      expect(
        files.find((f) => f.path === ".claude/skills/deploy")
      ).toBeDefined();
      expect(
        files.find((f) => f.path === ".claude/settings.json")
      ).toBeDefined();
    });

    describe("JSON overrides", () => {
      it("deep merges settings from state.settings.overrides.claudeCode", async () => {
        const state = createMinimalState({
          settings: {
            permissions: { allow: ["Bash(git:*)"] },
            overrides: {
              claudeCode: {
                model: "opus",
                customSetting: true,
              },
            },
          },
        });

        const files = await claudeCodePlugin.export(state, tempDir);

        const settings = files.find((f) => f.path === ".claude/settings.json");
        expect(settings).toBeDefined();
        const content = settings?.content as Record<string, unknown>;
        expect(content["model"]).toBe("opus");
        expect(content["customSetting"]).toBe(true);
        expect(content["permissions"]).toEqual({ allow: ["Bash(git:*)"] });
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

        const files = await claudeCodePlugin.export(state, tempDir);

        const settings = files.find((f) => f.path === ".claude/settings.json");
        expect(settings).toBeDefined();
        const content = settings?.content as Record<string, unknown>;
        expect(content["model"]).toBe("opus");
        expect(content["theme"]).toBeUndefined();
      });
    });

    describe("file symlinks", () => {
      it("creates symlinks for other override files", async () => {
        // Create override directory with files
        const commandsDir = path.join(tempDir, ".ai", ".claude", "commands");
        await fs.mkdir(commandsDir, { recursive: true });
        await fs.writeFile(
          path.join(commandsDir, "custom.md"),
          "# Custom Command"
        );

        const state = createMinimalState();

        const files = await claudeCodePlugin.export(state, tempDir);

        const customCommand = files.find(
          (f) => f.path === ".claude/commands/custom.md"
        );
        expect(customCommand).toBeDefined();
        expect(customCommand?.type).toBe("symlink");
        expect(customCommand?.target).toBe("../../.ai/.claude/commands/custom.md");
      });

      it("does not create symlink if target file already exists", async () => {
        // Create override file
        const overrideDir = path.join(tempDir, ".ai", ".claude", "commands");
        await fs.mkdir(overrideDir, { recursive: true });
        await fs.writeFile(path.join(overrideDir, "existing.md"), "# Override");

        // Create existing file at target location
        const targetDir = path.join(tempDir, ".claude", "commands");
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, "existing.md"), "# Existing");

        const state = createMinimalState();

        const files = await claudeCodePlugin.export(state, tempDir);

        const existingFile = files.find(
          (f) => f.path === ".claude/commands/existing.md"
        );
        expect(existingFile).toBeUndefined();
      });

      it("handles nested override directories", async () => {
        // Create nested override structure
        const nestedDir = path.join(
          tempDir,
          ".ai",
          ".claude",
          "deep",
          "nested"
        );
        await fs.mkdir(nestedDir, { recursive: true });
        await fs.writeFile(path.join(nestedDir, "file.md"), "# Nested File");

        const state = createMinimalState();

        const files = await claudeCodePlugin.export(state, tempDir);

        const nestedFile = files.find(
          (f) => f.path === ".claude/deep/nested/file.md"
        );
        expect(nestedFile).toBeDefined();
        expect(nestedFile?.type).toBe("symlink");
        expect(nestedFile?.target).toBe("../../../.ai/.claude/deep/nested/file.md");
      });
    });
  });

  describe("validate", () => {
    it("returns valid true for full state", () => {
      const state = createFullState();

      const result = claudeCodePlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns warning when agents is missing", () => {
      const state = createMinimalState({ agents: null });

      const result = claudeCodePlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain("AGENTS.md");
    });

    it("no warning when agents exists", () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const result = claudeCodePlugin.validate(state);

      expect(result.warnings).toHaveLength(0);
    });
  });
});
