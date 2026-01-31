import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createFullState,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { cursorPlugin } from "./index";

describe("cursorPlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(cursorPlugin.id).toBe("cursor");
      expect(cursorPlugin.name).toBe("Cursor");
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

    it("creates AGENTS.md symlink at project root when agents exists", async () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const files = await cursorPlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === "AGENTS.md");
      expect(agentsMd).toBeDefined();
      expect(agentsMd?.type).toBe("symlink");
      expect(agentsMd?.target).toBe(".ai/AGENTS.md");
    });

    it("skips AGENTS.md symlink when no agents", async () => {
      const state = createMinimalState({ agents: null });

      const files = await cursorPlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === "AGENTS.md");
      expect(agentsMd).toBeUndefined();
    });

    it("generates transformed .mdc rule files", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["src/**/*.ts"] },
            content: "# TypeScript Rules\n\nUse strict mode.",
          },
        ],
      });

      const files = await cursorPlugin.export(state, tempDir);

      const ruleFile = files.find(
        (f) => f.path === ".cursor/rules/typescript.mdc"
      );
      expect(ruleFile).toBeDefined();
      expect(ruleFile?.type).toBe("text");

      const content = ruleFile?.content as string;
      expect(content).toContain("---");
      expect(content).toContain('description: "TypeScript Rules"');
      expect(content).toContain('  - "src/**/*.ts"');
      expect(content).toContain("alwaysApply: false");
      expect(content).toContain("# TypeScript Rules");
    });

    it("generates multiple rule files", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["*.ts"] },
            content: "# TypeScript",
          },
          {
            path: "code-organization.md",
            frontmatter: { paths: ["src/**/*"] },
            content: "# Code Organization",
          },
        ],
      });

      const files = await cursorPlugin.export(state, tempDir);

      const tsRule = files.find(
        (f) => f.path === ".cursor/rules/typescript.mdc"
      );
      const orgRule = files.find(
        (f) => f.path === ".cursor/rules/code-organization.mdc"
      );

      expect(tsRule).toBeDefined();
      expect(orgRule).toBeDefined();
    });

    it("skips rules when no rules exist", async () => {
      const state = createMinimalState({ rules: [] });

      const files = await cursorPlugin.export(state, tempDir);

      const ruleFiles = files.filter((f) => f.path.includes(".cursor/rules/"));
      expect(ruleFiles).toHaveLength(0);
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

      const files = await cursorPlugin.export(state, tempDir);

      const deploySkill = files.find((f) => f.path === ".cursor/skills/deploy");
      const testSkill = files.find((f) => f.path === ".cursor/skills/test");

      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");

      expect(testSkill).toBeDefined();
      expect(testSkill?.type).toBe("symlink");
      expect(testSkill?.target).toBe("../../.ai/skills/test");
    });

    it("skips skills when no skills exist", async () => {
      const state = createMinimalState({ skills: [] });

      const files = await cursorPlugin.export(state, tempDir);

      const skillFiles = files.filter((f) => f.path.includes("skills"));
      expect(skillFiles).toHaveLength(0);
    });

    it("exports full state correctly", async () => {
      const state = createFullState();

      const files = await cursorPlugin.export(state, tempDir);

      // Should have AGENTS.md at root
      expect(files.find((f) => f.path === "AGENTS.md")).toBeDefined();

      // Should have .mdc rule files (not symlink to rules/)
      const ruleFiles = files.filter((f) => f.path.endsWith(".mdc"));
      expect(ruleFiles.length).toBeGreaterThan(0);

      // Should have skill symlinks
      expect(
        files.find((f) => f.path === ".cursor/skills/deploy")
      ).toBeDefined();

      // Should have mcp.json (createFullState includes MCP servers)
      expect(files.find((f) => f.path === ".cursor/mcp.json")).toBeDefined();
    });

    describe("MCP servers", () => {
      it("creates mcp.json when MCP servers exist", async () => {
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

        const files = await cursorPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".cursor/mcp.json");
        expect(mcpJson).toBeDefined();
        expect(mcpJson?.type).toBe("json");

        const content = mcpJson?.content as {
          mcpServers: Record<string, unknown>;
        };
        expect(content.mcpServers).toBeDefined();
        expect(content.mcpServers["db"]).toBeDefined();
      });

      it("transforms environment variables in mcp.json", async () => {
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

        const files = await cursorPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".cursor/mcp.json");
        const content = mcpJson?.content as {
          mcpServers: { db: { env: Record<string, string> } };
        };
        expect(content.mcpServers.db.env["DB_URL"]).toBe("${env:DB_URL}");
      });

      it("skips mcp.json when no MCP servers", async () => {
        const state = createMinimalState();

        const files = await cursorPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".cursor/mcp.json");
        expect(mcpJson).toBeUndefined();
      });

      it("handles HTTP MCP servers", async () => {
        const state = createMinimalState({
          settings: {
            mcpServers: {
              api: {
                type: "http",
                url: "https://api.example.com/mcp",
                headers: { Authorization: "Bearer ${TOKEN}" },
              },
            },
          },
        });

        const files = await cursorPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".cursor/mcp.json");
        const content = mcpJson?.content as {
          mcpServers: { api: { url: string; headers: Record<string, string> } };
        };
        expect(content.mcpServers.api.url).toBe("https://api.example.com/mcp");
        expect(content.mcpServers.api.headers["Authorization"]).toBe(
          "Bearer ${env:TOKEN}"
        );
      });
    });

    describe("permissions", () => {
      it("creates cli.json when permissions exist", async () => {
        const state = createMinimalState({
          settings: {
            permissions: {
              allow: ["Bash(git:*)"],
              deny: ["Read(.env)"],
            },
          },
        });

        const files = await cursorPlugin.export(state, tempDir);

        const cliJson = files.find((f) => f.path === ".cursor/cli.json");
        expect(cliJson).toBeDefined();
        expect(cliJson?.type).toBe("json");

        const content = cliJson?.content as {
          permissions: { allow: string[]; deny: string[] };
        };
        expect(content.permissions).toBeDefined();
        expect(content.permissions.allow).toContain("Shell(git)");
        expect(content.permissions.deny).toContain("Read(.env)");
      });

      it("transforms Bash to Shell in permissions", async () => {
        const state = createMinimalState({
          settings: {
            permissions: {
              allow: ["Bash(git:*)", "Bash(npm:*)"],
            },
          },
        });

        const files = await cursorPlugin.export(state, tempDir);

        const cliJson = files.find((f) => f.path === ".cursor/cli.json");
        const content = cliJson?.content as {
          permissions: { allow: string[]; deny: string[] };
        };
        expect(content.permissions.allow).toContain("Shell(git)");
        expect(content.permissions.allow).toContain("Shell(npm)");
      });

      it("maps ask permissions to allow", async () => {
        const state = createMinimalState({
          settings: {
            permissions: {
              ask: ["Bash(npm:*)"],
            },
          },
        });

        const files = await cursorPlugin.export(state, tempDir);

        const cliJson = files.find((f) => f.path === ".cursor/cli.json");
        const content = cliJson?.content as {
          permissions: { allow: string[]; deny: string[] };
        };
        expect(content.permissions.allow).toContain("Shell(npm)");
      });

      it("skips cli.json when no permissions", async () => {
        const state = createMinimalState();

        const files = await cursorPlugin.export(state, tempDir);

        const cliJson = files.find((f) => f.path === ".cursor/cli.json");
        expect(cliJson).toBeUndefined();
      });
    });

    describe("file symlinks", () => {
      it("creates symlinks for override files from .ai/.cursor/", async () => {
        // Create override directory with files
        const customDir = path.join(tempDir, ".ai", ".cursor", "custom");
        await fs.mkdir(customDir, { recursive: true });
        await fs.writeFile(
          path.join(customDir, "config.md"),
          "# Custom Config"
        );

        const state = createMinimalState();

        const files = await cursorPlugin.export(state, tempDir);

        const customConfig = files.find(
          (f) => f.path === ".cursor/custom/config.md"
        );
        expect(customConfig).toBeDefined();
        expect(customConfig?.type).toBe("symlink");
        expect(customConfig?.target).toBe("../../.ai/.cursor/custom/config.md");
      });

      it("replaces generated file with override symlink when paths match", async () => {
        // Create override file that matches a generated file path
        const overrideDir = path.join(tempDir, ".ai", ".cursor");
        await fs.mkdir(overrideDir, { recursive: true });
        await fs.writeFile(
          path.join(overrideDir, "mcp.json"),
          '{"custom": true}'
        );

        const state = createMinimalState({
          settings: {
            mcpServers: {
              db: { command: "npx", args: ["-y", "@example/db"] },
            },
          },
        });

        const files = await cursorPlugin.export(state, tempDir);

        // Should have the override symlink, not the generated file
        const mcpJson = files.find((f) => f.path === ".cursor/mcp.json");
        expect(mcpJson).toBeDefined();
        expect(mcpJson?.type).toBe("symlink");
        expect(mcpJson?.target).toBe("../.ai/.cursor/mcp.json");
      });

      it("handles nested override directories", async () => {
        // Create nested override structure
        const nestedDir = path.join(
          tempDir,
          ".ai",
          ".cursor",
          "deep",
          "nested"
        );
        await fs.mkdir(nestedDir, { recursive: true });
        await fs.writeFile(path.join(nestedDir, "file.md"), "# Nested File");

        const state = createMinimalState();

        const files = await cursorPlugin.export(state, tempDir);

        const nestedFile = files.find(
          (f) => f.path === ".cursor/deep/nested/file.md"
        );
        expect(nestedFile).toBeDefined();
        expect(nestedFile?.type).toBe("symlink");
        expect(nestedFile?.target).toBe(
          "../../../.ai/.cursor/deep/nested/file.md"
        );
      });
    });
  });

  describe("validate", () => {
    it("returns valid true for full state", () => {
      const state = createFullState();

      const result = cursorPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns warning when agents is missing", () => {
      const state = createMinimalState({ agents: null });

      const result = cursorPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain("AGENTS.md");
    });

    it("no warning when agents exists", () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const result = cursorPlugin.validate(state);

      expect(result.warnings).toHaveLength(0);
    });

    it("no skipped features", () => {
      const state = createMinimalState({
        skills: [
          {
            path: "deploy",
            frontmatter: { name: "deploy", description: "Deploy" },
            content: "",
          },
        ],
      });

      const result = cursorPlugin.validate(state);

      expect(result.skipped).toHaveLength(0);
    });

    it("returns warning when ask permissions are used", () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
            ask: ["Bash(npm:*)"],
          },
        },
      });

      const result = cursorPlugin.validate(state);

      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      const askWarning = result.warnings.find((w) => w.message.includes("ask"));
      expect(askWarning).toBeDefined();
      expect(askWarning?.message).toContain("allow");
    });

    it("no warning when only allow and deny permissions", () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
            deny: ["Read(.env)"],
          },
        },
      });

      const result = cursorPlugin.validate(state);

      const askWarning = result.warnings.find((w) => w.message.includes("ask"));
      expect(askWarning).toBeUndefined();
    });
  });
});
