import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTempDir,
  createMinimalState,
  createTempDir,
} from "../../__tests__/utils";
import { codexPlugin } from "./index";

describe("codexPlugin", () => {
  describe("metadata", () => {
    it("has correct id and name", () => {
      expect(codexPlugin.id).toBe("codex");
      expect(codexPlugin.name).toBe("Codex");
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

      const files = await codexPlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === "AGENTS.md");
      expect(agentsMd).toBeDefined();
      expect(agentsMd?.type).toBe("symlink");
      expect(agentsMd?.target).toBe(".ai/AGENTS.md");
    });

    it("creates subdirectory AGENTS.md files from rules", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "typescript.md",
            frontmatter: { paths: ["apps/cli/**/*.ts"] },
            content: "# TypeScript Rules\n\nUse strict mode.",
          },
        ],
      });

      const files = await codexPlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === "apps/cli/AGENTS.md");
      expect(agentsMd).toBeDefined();
      expect(agentsMd?.type).toBe("text");
      expect(agentsMd?.content).toContain("## typescript.md");
      expect(agentsMd?.content).toContain("Use strict mode.");
    });

    it("skips root-scoped rules", async () => {
      const state = createMinimalState({
        rules: [
          {
            path: "root.md",
            frontmatter: { paths: ["**/*.md"] },
            content: "# Root Rules",
          },
        ],
      });

      const files = await codexPlugin.export(state, tempDir);

      const agentsMd = files.find((f) => f.path === "AGENTS.md");
      expect(agentsMd).toBeUndefined();
    });

    it("creates codex config.toml for mcp servers", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            db: {
              command: "npx",
              args: ["-y", "@example/db"],
              env: { DB_URL: "${DB_URL}" },
            },
            remote: {
              url: "http://localhost:3000",
              headers: { Authorization: "Bearer token" },
            },
          },
        },
      });

      const files = await codexPlugin.export(state, tempDir);

      const configToml = files.find((f) => f.path === ".codex/config.toml");
      expect(configToml).toBeDefined();
      expect(configToml?.type).toBe("text");

      const content = String(configToml?.content);
      expect(content).toContain("[mcp_servers.db]");
      expect(content).toContain('command = "npx"');
      expect(content).toContain('args = ["-y", "@example/db"]');
      expect(content).toContain('env = { DB_URL = "${DB_URL}" }');
      expect(content).toContain("[mcp_servers.remote]");
      expect(content).toContain('url = "http://localhost:3000"');
      expect(content).toContain(
        'http_headers = { Authorization = "Bearer token" }'
      );
    });

    it("creates skill symlinks", async () => {
      const state = createMinimalState({
        skills: [
          {
            path: "deploy",
            frontmatter: { name: "deploy", description: "Deploy" },
            content: "# Deploy",
          },
        ],
      });

      const files = await codexPlugin.export(state, tempDir);

      const deploySkill = files.find((f) => f.path === ".agents/skills/deploy");
      expect(deploySkill).toBeDefined();
      expect(deploySkill?.type).toBe("symlink");
      expect(deploySkill?.target).toBe("../../.ai/skills/deploy");
    });
  });

  describe("validate", () => {
    it("reports warnings and skipped permissions", () => {
      const state = createMinimalState({
        rules: [
          {
            path: "root.md",
            frontmatter: { paths: ["**/*.md"] },
            content: "# Root Rules",
          },
        ],
        settings: {
          permissions: { allow: ["Bash(git:*)"] },
          mcpServers: {
            invalid: {},
          },
        },
      });

      const result = codexPlugin.validate(state);

      expect(
        result.warnings.some((w) =>
          w.message.includes("root globs are not exported")
        )
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes("root AGENTS.md"))
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes("no command or url"))
      ).toBe(true);
      expect(result.skipped.some((s) => s.feature === "permissions")).toBe(
        true
      );
    });
  });
});
