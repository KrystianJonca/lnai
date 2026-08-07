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

    it("syncs client_id into a nested [mcp_servers.<name>.oauth] table and scopes as a sibling key", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            "my-remote-server": {
              url: "http://localhost:3000",
              oauth: {
                clientId: "client-123",
                clientSecret: "shh-its-a-secret",
                callbackPort: 8080,
                scopes: ["read", "write"],
              },
            },
          },
        },
      });

      const files = await codexPlugin.export(state, tempDir);

      const configToml = files.find((f) => f.path === ".codex/config.toml");
      const content = String(configToml?.content);
      // The callback port is a single global setting in Codex, written as a
      // root-level key before any [mcp_servers.*] table headers
      expect(content).toContain("mcp_oauth_callback_port = 8080");
      expect(content.indexOf("mcp_oauth_callback_port")).toBeLessThan(
        content.indexOf("[mcp_servers.")
      );
      // `scopes` is a sibling of `oauth` under [mcp_servers.<name>], not nested inside it
      expect(content).toMatch(
        /\[mcp_servers\.my-remote-server\]\nurl = "http:\/\/localhost:3000"\nscopes = \["read", "write"\]/
      );
      expect(content).toContain("[mcp_servers.my-remote-server.oauth]");
      expect(content).toContain('client_id = "client-123"');
      // Codex's per-server oauth table has no client_secret field
      expect(content).not.toContain("client_secret");
      // callback_port is not a per-server field under [mcp_servers.*.oauth]
      expect(content).not.toMatch(/\ncallback_port =/);
    });

    it("omits scopes when not provided", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            remote: {
              url: "http://localhost:3000",
              oauth: { clientId: "client-123" },
            },
          },
        },
      });

      const files = await codexPlugin.export(state, tempDir);

      const configToml = files.find((f) => f.path === ".codex/config.toml");
      const content = String(configToml?.content);
      expect(content).toContain("[mcp_servers.remote.oauth]");
      expect(content).toContain('client_id = "client-123"');
      expect(content).not.toContain("mcp_oauth_callback_port");
      expect(content).not.toContain("client_secret");
      expect(content).not.toContain("scopes");
    });

    it("uses the first callbackPort when multiple servers disagree", async () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            first: {
              url: "http://localhost:3000",
              oauth: { clientId: "client-1", callbackPort: 8080 },
            },
            second: {
              url: "http://localhost:4000",
              oauth: { clientId: "client-2", callbackPort: 9090 },
            },
          },
        },
      });

      const files = await codexPlugin.export(state, tempDir);

      const configToml = files.find((f) => f.path === ".codex/config.toml");
      const content = String(configToml?.content);
      expect(content).toContain("mcp_oauth_callback_port = 8080");
      expect(content).not.toContain("mcp_oauth_callback_port = 9090");
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

    it("warns when MCP servers request conflicting OAuth callback ports", () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            first: {
              url: "http://localhost:3000",
              oauth: { clientId: "client-1", callbackPort: 8080 },
            },
            second: {
              url: "http://localhost:4000",
              oauth: { clientId: "client-2", callbackPort: 9090 },
            },
          },
        },
      });

      const result = codexPlugin.validate(state);

      const portWarning = result.warnings.find((w) =>
        w.message.includes("callbackPort")
      );
      expect(portWarning).toBeDefined();
      expect(portWarning?.message).toContain("8080");
      expect(portWarning?.message).toContain("9090");
      expect(portWarning?.message).toContain("mcp_oauth_callback_port");
    });

    it("no warning when servers agree on the same callback port", () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            first: {
              url: "http://localhost:3000",
              oauth: { clientId: "client-1", callbackPort: 8080 },
            },
            second: {
              url: "http://localhost:4000",
              oauth: { clientId: "client-2", callbackPort: 8080 },
            },
          },
        },
      });

      const result = codexPlugin.validate(state);

      const portWarning = result.warnings.find((w) =>
        w.message.includes("callbackPort")
      );
      expect(portWarning).toBeUndefined();
    });

    it("warns that Codex's oauth table has no clientSecret field", () => {
      const state = createMinimalState({
        settings: {
          mcpServers: {
            api: {
              url: "http://localhost:3000",
              oauth: { clientId: "client-123", clientSecret: "shh" },
            },
          },
        },
      });

      const result = codexPlugin.validate(state);

      const secretWarning = result.warnings.find((w) =>
        w.message.includes("clientSecret")
      );
      expect(secretWarning).toBeDefined();
      expect(secretWarning?.message).toContain("Codex");
    });
  });
});
