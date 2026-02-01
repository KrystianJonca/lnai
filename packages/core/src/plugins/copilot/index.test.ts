import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createFullState,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { copilotPlugin } from "./index";

describe("copilotPlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(copilotPlugin.id).toBe("copilot");
      expect(copilotPlugin.name).toBe("GitHub Copilot");
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

    it("creates copilot-instructions.md symlink when agents exists", async () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const files = await copilotPlugin.export(state, tempDir);

      const copilotInstructions = files.find(
        (f) => f.path === ".github/copilot-instructions.md"
      );
      expect(copilotInstructions).toBeDefined();
      expect(copilotInstructions?.type).toBe("symlink");
      expect(copilotInstructions?.target).toBe("../.ai/AGENTS.md");
    });

    it("skips copilot-instructions.md symlink when no agents", async () => {
      const state = createMinimalState({ agents: null });

      const files = await copilotPlugin.export(state, tempDir);

      const copilotInstructions = files.find(
        (f) => f.path === ".github/copilot-instructions.md"
      );
      expect(copilotInstructions).toBeUndefined();
    });

    it("generates transformed .instructions.md rule files", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["src/**/*.ts"] },
            content: "# TypeScript Rules\n\nUse strict mode.",
          },
        ],
      });

      const files = await copilotPlugin.export(state, tempDir);

      const ruleFile = files.find(
        (f) => f.path === ".github/instructions/typescript.instructions.md"
      );
      expect(ruleFile).toBeDefined();
      expect(ruleFile?.type).toBe("text");

      const content = ruleFile?.content as string;
      expect(content).toContain("---");
      expect(content).toContain('description: "TypeScript Rules"');
      expect(content).toContain('applyTo: "src/**/*.ts"');
      expect(content).toContain("# TypeScript Rules");
    });

    it("joins multiple paths with comma for applyTo", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["**/*.ts", "**/*.tsx"] },
            content: "# TypeScript Rules",
          },
        ],
      });

      const files = await copilotPlugin.export(state, tempDir);

      const ruleFile = files.find(
        (f) => f.path === ".github/instructions/typescript.instructions.md"
      );
      const content = ruleFile?.content as string;
      expect(content).toContain('applyTo: "**/*.ts,**/*.tsx"');
    });

    it("omits applyTo for global rules (empty paths)", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "general.md",
            frontmatter: { paths: [] },
            content: "# General Rules",
          },
        ],
      });

      const files = await copilotPlugin.export(state, tempDir);

      const ruleFile = files.find(
        (f) => f.path === ".github/instructions/general.instructions.md"
      );
      const content = ruleFile?.content as string;
      expect(content).not.toContain("applyTo:");
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

      const files = await copilotPlugin.export(state, tempDir);

      const tsRule = files.find(
        (f) => f.path === ".github/instructions/typescript.instructions.md"
      );
      const orgRule = files.find(
        (f) =>
          f.path === ".github/instructions/code-organization.instructions.md"
      );

      expect(tsRule).toBeDefined();
      expect(orgRule).toBeDefined();
    });

    it("skips rules when no rules exist", async () => {
      const state = createMinimalState({ rules: [] });

      const files = await copilotPlugin.export(state, tempDir);

      const ruleFiles = files.filter((f) =>
        f.path.includes(".github/instructions/")
      );
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

      const files = await copilotPlugin.export(state, tempDir);

      const deploySkill = files.find((f) => f.path === ".github/skills/deploy");
      const testSkill = files.find((f) => f.path === ".github/skills/test");

      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");

      expect(testSkill).toBeDefined();
      expect(testSkill?.type).toBe("symlink");
      expect(testSkill?.target).toBe("../../.ai/skills/test");
    });

    it("skips skills when no skills exist", async () => {
      const state = createMinimalState({ skills: [] });

      const files = await copilotPlugin.export(state, tempDir);

      const skillFiles = files.filter((f) => f.path.includes("skills"));
      expect(skillFiles).toHaveLength(0);
    });

    it("exports full state correctly", async () => {
      const state = createFullState();

      const files = await copilotPlugin.export(state, tempDir);

      // Should have copilot-instructions.md symlink
      expect(
        files.find((f) => f.path === ".github/copilot-instructions.md")
      ).toBeDefined();

      // Should have .instructions.md rule files
      const ruleFiles = files.filter((f) =>
        f.path.endsWith(".instructions.md")
      );
      expect(ruleFiles.length).toBeGreaterThan(0);

      // Should have skill symlinks
      expect(
        files.find((f) => f.path === ".github/skills/deploy")
      ).toBeDefined();

      // Should have mcp.json (createFullState includes MCP servers)
      expect(files.find((f) => f.path === ".vscode/mcp.json")).toBeDefined();
    });

    describe("MCP servers", () => {
      it("creates .vscode/mcp.json when MCP servers exist", async () => {
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

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        expect(mcpJson).toBeDefined();
        expect(mcpJson?.type).toBe("json");

        const content = mcpJson?.content as {
          inputs: unknown[];
          servers: Record<string, unknown>;
        };
        expect(content.inputs).toEqual([]);
        expect(content.servers["db"]).toBeDefined();
      });

      it("includes explicit type: stdio for stdio servers", async () => {
        const state = createMinimalState({
          settings: {
            mcpServers: {
              db: {
                command: "npx",
                args: ["-y", "@example/db"],
              },
            },
          },
        });

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        const content = mcpJson?.content as {
          servers: { db: { type: string } };
        };
        expect(content.servers.db.type).toBe("stdio");
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

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        const content = mcpJson?.content as {
          servers: { db: { env: Record<string, string> } };
        };
        expect(content.servers.db.env["DB_URL"]).toBe("${env:DB_URL}");
      });

      it("skips mcp.json when no MCP servers", async () => {
        const state = createMinimalState();

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        expect(mcpJson).toBeUndefined();
      });

      it("handles HTTP MCP servers with requestInit wrapper", async () => {
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

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        const content = mcpJson?.content as {
          servers: {
            api: {
              url: string;
              requestInit: { headers: Record<string, string> };
            };
          };
        };
        expect(content.servers.api.url).toBe("https://api.example.com/mcp");
        expect(content.servers.api.requestInit.headers["Authorization"]).toBe(
          "Bearer ${env:TOKEN}"
        );
      });

      it("handles SSE MCP servers as remote servers", async () => {
        const state = createMinimalState({
          settings: {
            mcpServers: {
              stream: {
                type: "sse",
                url: "https://api.example.com/sse",
              },
            },
          },
        });

        const files = await copilotPlugin.export(state, tempDir);

        const mcpJson = files.find((f) => f.path === ".vscode/mcp.json");
        const content = mcpJson?.content as {
          servers: { stream: { url: string } };
        };
        expect(content.servers.stream.url).toBe("https://api.example.com/sse");
      });
    });

    describe("file symlinks", () => {
      it("creates symlinks for override files from .ai/.copilot/", async () => {
        // Create override directory with files
        const customDir = path.join(tempDir, ".ai", ".copilot", "custom");
        await fs.mkdir(customDir, { recursive: true });
        await fs.writeFile(
          path.join(customDir, "config.md"),
          "# Custom Config"
        );

        const state = createMinimalState();

        const files = await copilotPlugin.export(state, tempDir);

        const customConfig = files.find(
          (f) => f.path === ".github/custom/config.md"
        );
        expect(customConfig).toBeDefined();
        expect(customConfig?.type).toBe("symlink");
        expect(customConfig?.target).toBe(
          "../../.ai/.copilot/custom/config.md"
        );
      });

      it("replaces generated file with override symlink when paths match", async () => {
        // Create override file that matches a generated file path
        const overrideDir = path.join(tempDir, ".ai", ".copilot");
        await fs.mkdir(path.join(overrideDir, "instructions"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(overrideDir, "instructions", "typescript.instructions.md"),
          "# Custom Instructions"
        );

        const state = createMinimalState({
          rules: [
            {
              path: "typescript.md",
              frontmatter: { paths: ["*.ts"] },
              content: "# TypeScript Rules",
            },
          ],
        });

        const files = await copilotPlugin.export(state, tempDir);

        // Should have the override symlink, not the generated file
        const rule = files.find(
          (f) => f.path === ".github/instructions/typescript.instructions.md"
        );
        expect(rule).toBeDefined();
        expect(rule?.type).toBe("symlink");
        expect(rule?.target).toBe(
          "../../.ai/.copilot/instructions/typescript.instructions.md"
        );
      });

      it("handles nested override directories", async () => {
        // Create nested override structure
        const nestedDir = path.join(
          tempDir,
          ".ai",
          ".copilot",
          "deep",
          "nested"
        );
        await fs.mkdir(nestedDir, { recursive: true });
        await fs.writeFile(path.join(nestedDir, "file.md"), "# Nested File");

        const state = createMinimalState();

        const files = await copilotPlugin.export(state, tempDir);

        const nestedFile = files.find(
          (f) => f.path === ".github/deep/nested/file.md"
        );
        expect(nestedFile).toBeDefined();
        expect(nestedFile?.type).toBe("symlink");
        expect(nestedFile?.target).toBe(
          "../../../.ai/.copilot/deep/nested/file.md"
        );
      });
    });
  });

  describe("validate", () => {
    it("returns valid true for full state", () => {
      const state = createFullState();

      const result = copilotPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns warning when agents is missing", () => {
      const state = createMinimalState({ agents: null });

      const result = copilotPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain("AGENTS.md");
      expect(result.warnings[0]?.message).toContain("copilot-instructions.md");
    });

    it("no warning when agents exists", () => {
      const state = createMinimalState({ agents: "# Instructions" });

      const result = copilotPlugin.validate(state);

      const agentsWarning = result.warnings.find((w) =>
        w.message.includes("AGENTS.md")
      );
      expect(agentsWarning).toBeUndefined();
    });

    it("returns warning when permissions are configured", () => {
      const state = createMinimalState({
        settings: {
          permissions: {
            allow: ["Bash(git:*)"],
          },
        },
      });

      const result = copilotPlugin.validate(state);

      const permSkipped = result.skipped.find(
        (s) => s.feature === "permissions"
      );
      expect(permSkipped).toBeDefined();
      expect(permSkipped?.reason).toContain("does not support");
    });

    it("no skipped when permissions are empty", () => {
      const state = createMinimalState({
        settings: {
          permissions: {},
        },
      });

      const result = copilotPlugin.validate(state);

      const permSkipped = result.skipped.find(
        (s) => s.feature === "permissions"
      );
      expect(permSkipped).toBeUndefined();
    });

    it("returns warning for MCP servers without command or type", () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            invalid: { args: ["-y"] } as Record<string, unknown>,
            valid: { command: "npx" },
          },
        },
      });

      const result = copilotPlugin.validate(state);

      const mcpWarning = result.warnings.find((w) =>
        w.message.includes("invalid")
      );
      expect(mcpWarning).toBeDefined();
      expect(mcpWarning?.message).toContain("will be skipped");
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

      const result = copilotPlugin.validate(state);

      expect(result.skipped).toHaveLength(0);
    });
  });
});
