import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createFullState,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { geminiPlugin } from "./index";

describe("geminiPlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(geminiPlugin.id).toBe("gemini");
      expect(geminiPlugin.name).toBe("Gemini CLI");
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

    it("creates GEMINI.md symlink when agents exists", async () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const files = await geminiPlugin.export(state, tempDir);

      const geminiMd = files.find((f) => f.path === ".gemini/GEMINI.md");
      expect(geminiMd).toBeDefined();
      expect(geminiMd?.type).toBe("symlink");
      expect(geminiMd?.target).toBe("../.ai/AGENTS.md");
    });

    it("skips GEMINI.md symlink when no agents", async () => {
      const state = createMinimalState({ agents: null });

      const files = await geminiPlugin.export(state, tempDir);

      const geminiMd = files.find((f) => f.path === ".gemini/GEMINI.md");
      expect(geminiMd).toBeUndefined();
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

      const files = await geminiPlugin.export(state, tempDir);

      const deploySkill = files.find((f) => f.path === ".gemini/skills/deploy");
      const testSkill = files.find((f) => f.path === ".gemini/skills/test");

      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");

      expect(testSkill).toBeDefined();
      expect(testSkill?.type).toBe("symlink");
      expect(testSkill?.target).toBe("../../.ai/skills/test");
    });

    it("creates settings.json with mcpServers", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            db: { command: "npx", args: ["-y", "@example/db"] },
          },
        },
      });

      const files = await geminiPlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".gemini/settings.json");
      expect(settings).toBeDefined();
      expect(settings?.type).toBe("json");
      expect(
        (settings?.content as Record<string, unknown>)["mcpServers"]
      ).toBeDefined();
    });

    it("transforms url to httpUrl in mcpServers", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            remote: { url: "http://localhost:3000" },
          },
        },
      });

      const files = await geminiPlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".gemini/settings.json");
      expect(settings).toBeDefined();
      const mcpServers = (settings?.content as Record<string, unknown>)[
        "mcpServers"
      ] as Record<string, unknown>;
      expect((mcpServers["remote"] as Record<string, unknown>)["httpUrl"]).toBe(
        "http://localhost:3000"
      );
    });

    it("skips settings.json when no mcpServers", async () => {
      const state = createMinimalState({ settings: {} });

      const files = await geminiPlugin.export(state, tempDir);

      const settings = files.find((f) => f.path === ".gemini/settings.json");
      expect(settings).toBeUndefined();
    });

    it("creates GEMINI.md files for rules in subdirectories", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["src/**/*.ts"] },
            content: "Use strict mode",
          },
        ],
      });

      const files = await geminiPlugin.export(state, tempDir);

      const srcGemini = files.find((f) => f.path === "src/GEMINI.md");
      expect(srcGemini).toBeDefined();
      expect(srcGemini?.type).toBe("text");
      expect(srcGemini?.content).toContain("typescript.md");
      expect(srcGemini?.content).toContain("Use strict mode");
    });

    it("creates root GEMINI.md for rules targeting root files", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "readme.md",
            frontmatter: { paths: ["README.md"] },
            content: "Keep it short",
          },
        ],
      });

      const files = await geminiPlugin.export(state, tempDir);

      const rootGemini = files.find((f) => f.path === "GEMINI.md");
      expect(rootGemini).toBeDefined();
      expect(rootGemini?.type).toBe("text");
      expect(rootGemini?.content).toContain("readme.md");
    });

    it("combines multiple rules for same directory", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "rule1.md",
            frontmatter: { paths: ["src/**/*.ts"] },
            content: "Content 1",
          },
          {
            path: "rule2.md",
            frontmatter: { paths: ["src/**/*.tsx"] },
            content: "Content 2",
          },
        ],
      });

      const files = await geminiPlugin.export(state, tempDir);

      const srcGemini = files.find((f) => f.path === "src/GEMINI.md");
      expect(srcGemini).toBeDefined();
      expect(srcGemini?.content).toContain("rule1.md");
      expect(srcGemini?.content).toContain("Content 1");
      expect(srcGemini?.content).toContain("rule2.md");
      expect(srcGemini?.content).toContain("Content 2");
      expect(srcGemini?.content).toContain("---");
    });

    describe("file overrides", () => {
      it("creates symlinks for override files", async () => {
        const overrideDir = path.join(tempDir, ".ai", ".gemini", "custom");
        await fs.mkdir(overrideDir, { recursive: true });
        await fs.writeFile(path.join(overrideDir, "file.md"), "# Custom");

        const state = createMinimalState();

        const files = await geminiPlugin.export(state, tempDir);

        const customFile = files.find(
          (f) => f.path === ".gemini/custom/file.md"
        );
        expect(customFile).toBeDefined();
        expect(customFile?.type).toBe("symlink");
        expect(customFile?.target).toBe("../../.ai/.gemini/custom/file.md");
      });

      it("replaces generated file with override symlink when paths match", async () => {
        const overrideDir = path.join(tempDir, ".ai", ".gemini");
        await fs.mkdir(overrideDir, { recursive: true });
        await fs.writeFile(
          path.join(overrideDir, "settings.json"),
          '{"custom": true}'
        );

        const state = createMinimalState({
          settings: {
            mcpServers: {
              db: { command: "node", args: ["server.js"] },
            },
          },
        });

        const files = await geminiPlugin.export(state, tempDir);

        const settings = files.find((f) => f.path === ".gemini/settings.json");
        expect(settings).toBeDefined();
        expect(settings?.type).toBe("symlink");
        expect(settings?.target).toBe("../.ai/.gemini/settings.json");
      });
    });
  });

  describe("validate", () => {
    it("returns valid true for full state", () => {
      const state = createFullState();

      const result = geminiPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns warning when agents is missing", () => {
      const state = createMinimalState({ agents: null });

      const result = geminiPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes("AGENTS.md"))).toBe(
        true
      );
    });

    it("returns skipped when permissions are configured", () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
          },
        },
      });

      const result = geminiPlugin.validate(state);

      expect(result.valid).toBe(true);
      const permSkipped = result.skipped.find(
        (s) => s.feature === "permissions"
      );
      expect(permSkipped).toBeDefined();
      expect(permSkipped?.reason).toContain("does not support");
    });

    it("returns warning when rules exist", () => {
      const state = createMinimalState({
        rules: [
          {
            path: "rule.md",
            frontmatter: { paths: ["*.ts"] },
            content: "",
          },
        ],
      });

      const result = geminiPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes("GEMINI.md"))).toBe(
        true
      );
    });
  });

  describe("detect", () => {
    it("returns false (no auto-detection)", async () => {
      const result = await geminiPlugin.detect("/some/path");
      expect(result).toBe(false);
    });
  });

  describe("import", () => {
    it("returns null (no import support)", async () => {
      const result = await geminiPlugin.import("/some/path");
      expect(result).toBeNull();
    });
  });
});
