import { describe, expect, it } from "vitest";

import type { UnifiedState } from "../../types/index";
import { windsurfPlugin } from "./index";

function createBaseState(): UnifiedState {
  return {
    config: {},
    settings: null,
    agents: null,
    rules: [],
    skills: [],
  };
}

describe("windsurfPlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(windsurfPlugin.id).toBe("windsurf");
      expect(windsurfPlugin.name).toBe("Windsurf");
    });
  });

  describe("detect", () => {
    it("returns false (not implemented)", async () => {
      const result = await windsurfPlugin.detect("/tmp");
      expect(result).toBe(false);
    });
  });

  describe("import", () => {
    it("returns null (not implemented)", async () => {
      const result = await windsurfPlugin.import("/tmp");
      expect(result).toBeNull();
    });
  });

  describe("export", () => {
    it("creates AGENTS.md symlink at project root when agents exist", async () => {
      const state = createBaseState();
      state.agents = "# Project Guidelines";

      const files = await windsurfPlugin.export(state, "/tmp");

      const agentsFile = files.find((f) => f.path === "AGENTS.md");
      expect(agentsFile).toBeDefined();
      expect(agentsFile?.type).toBe("symlink");
      expect(agentsFile?.target).toBe(".ai/AGENTS.md");
    });

    it("does not create AGENTS.md when agents is null", async () => {
      const state = createBaseState();

      const files = await windsurfPlugin.export(state, "/tmp");

      const agentsFile = files.find((f) => f.path === "AGENTS.md");
      expect(agentsFile).toBeUndefined();
    });

    it("creates transformed rule files with manual trigger", async () => {
      const state = createBaseState();
      state.rules = [
        {
          path: "typescript.md",
          frontmatter: { paths: ["**/*.ts"] },
          content: "Use TypeScript.",
        },
      ];

      const files = await windsurfPlugin.export(state, "/tmp");

      const ruleFile = files.find(
        (f) => f.path === ".windsurf/rules/typescript.md"
      );
      expect(ruleFile).toBeDefined();
      expect(ruleFile?.type).toBe("text");
      expect(ruleFile?.content).toContain("trigger: manual");
      expect(ruleFile?.content).toContain("Use TypeScript.");
    });

    it("creates multiple rule files", async () => {
      const state = createBaseState();
      state.rules = [
        {
          path: "typescript.md",
          frontmatter: { paths: ["**/*.ts"] },
          content: "TypeScript rules.",
        },
        {
          path: "testing.md",
          frontmatter: { paths: ["**/*.test.ts"] },
          content: "Testing rules.",
        },
      ];

      const files = await windsurfPlugin.export(state, "/tmp");

      const tsRule = files.find(
        (f) => f.path === ".windsurf/rules/typescript.md"
      );
      const testRule = files.find(
        (f) => f.path === ".windsurf/rules/testing.md"
      );

      expect(tsRule).toBeDefined();
      expect(testRule).toBeDefined();
    });

    it("creates skill symlinks", async () => {
      const state = createBaseState();
      state.skills = [
        {
          path: "deploy",
          frontmatter: { name: "deploy", description: "Deploy to prod" },
          content: "Deploy steps.",
        },
      ];

      const files = await windsurfPlugin.export(state, "/tmp");

      const skillFile = files.find((f) => f.path === ".windsurf/skills/deploy");
      expect(skillFile).toBeDefined();
      expect(skillFile?.type).toBe("symlink");
      expect(skillFile?.target).toBe("../../.ai/skills/deploy");
    });

    it("does not export MCP servers", async () => {
      const state = createBaseState();
      state.settings = {
        mcpServers: {
          github: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
          },
        },
      };

      const files = await windsurfPlugin.export(state, "/tmp");

      const mcpFile = files.find((f) => f.path.includes("mcp"));
      expect(mcpFile).toBeUndefined();
    });

    it("does not export permissions", async () => {
      const state = createBaseState();
      state.settings = {
        permissions: {
          allow: ["Bash(git:*)"],
          deny: ["Read(.env)"],
        },
      };

      const files = await windsurfPlugin.export(state, "/tmp");

      const permFile = files.find(
        (f) => f.path.includes("permission") || f.path.includes("cli")
      );
      expect(permFile).toBeUndefined();
    });
  });

  describe("validate", () => {
    it("returns valid result for minimal state", () => {
      const state = createBaseState();

      const result = windsurfPlugin.validate(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("warns when AGENTS.md is missing", () => {
      const state = createBaseState();

      const result = windsurfPlugin.validate(state);

      expect(result.warnings).toContainEqual({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - root AGENTS.md will not be created",
      });
    });

    it("does not warn when AGENTS.md exists", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";

      const result = windsurfPlugin.validate(state);

      const agentsWarning = result.warnings.find((w) =>
        w.path.includes("AGENTS.md")
      );
      expect(agentsWarning).toBeUndefined();
    });

    it("reports skipped MCP servers", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";
      state.settings = {
        mcpServers: {
          github: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
          },
        },
      };

      const result = windsurfPlugin.validate(state);

      expect(result.skipped).toContainEqual({
        feature: "mcpServers",
        reason:
          "Windsurf uses global MCP config at ~/.codeium/windsurf/mcp_config.json - project-level MCP servers are not exported",
      });
    });

    it("reports skipped permissions", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";
      state.settings = {
        permissions: {
          allow: ["Bash(git:*)"],
        },
      };

      const result = windsurfPlugin.validate(state);

      expect(result.skipped).toContainEqual({
        feature: "permissions",
        reason: "Windsurf does not support declarative permissions",
      });
    });

    it("does not report skipped permissions when empty", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";
      state.settings = {
        permissions: {},
      };

      const result = windsurfPlugin.validate(state);

      const permSkipped = result.skipped.find(
        (s) => s.feature === "permissions"
      );
      expect(permSkipped).toBeUndefined();
    });

    it("warns about manual rule invocation when rules exist", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";
      state.rules = [
        {
          path: "typescript.md",
          frontmatter: { paths: ["**/*.ts"] },
          content: "Use TypeScript.",
        },
      ];

      const result = windsurfPlugin.validate(state);

      expect(result.warnings).toContainEqual({
        path: [".windsurf/rules"],
        message:
          "Rules are exported with 'trigger: manual' and require explicit @mention to invoke",
      });
    });

    it("does not warn about manual invocation when no rules", () => {
      const state = createBaseState();
      state.agents = "# Guidelines";

      const result = windsurfPlugin.validate(state);

      const rulesWarning = result.warnings.find((w) =>
        w.path.includes(".windsurf/rules")
      );
      expect(rulesWarning).toBeUndefined();
    });
  });
});
