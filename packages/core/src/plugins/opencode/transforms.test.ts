import { describe, expect, it } from "vitest";

import {
  transformMcpToOpenCode,
  transformPermissionsToOpenCode,
} from "./transforms";

describe("transformMcpToOpenCode", () => {
  describe("stdio servers", () => {
    it("converts command/args to command array", () => {
      const result = transformMcpToOpenCode({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
        },
      });

      expect(result?.["db"]?.type).toBe("local");
      expect(result?.["db"]?.command).toEqual(["npx", "-y", "@example/db"]);
    });

    it("handles command without args", () => {
      const result = transformMcpToOpenCode({
        simple: {
          command: "node",
        },
      });

      expect(result?.["simple"]?.type).toBe("local");
      expect(result?.["simple"]?.command).toEqual(["node"]);
    });

    it("transforms environment variables", () => {
      const result = transformMcpToOpenCode({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
          env: {
            DB_URL: "${DB_URL}",
            API_KEY: "${API_KEY:-default}",
          },
        },
      });

      expect(result?.["db"]?.environment?.["DB_URL"]).toBe("{env:DB_URL}");
      expect(result?.["db"]?.environment?.["API_KEY"]).toBe("{env:API_KEY}");
    });

    it("preserves regular env values", () => {
      const result = transformMcpToOpenCode({
        db: {
          command: "npx",
          env: {
            NODE_ENV: "production",
            DB_URL: "${DB_URL}",
          },
        },
      });

      expect(result?.["db"]?.environment?.["NODE_ENV"]).toBe("production");
      expect(result?.["db"]?.environment?.["DB_URL"]).toBe("{env:DB_URL}");
    });
  });

  describe("http servers", () => {
    it("converts to remote type", () => {
      const result = transformMcpToOpenCode({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
        },
      });

      expect(result?.["api"]?.type).toBe("remote");
      expect(result?.["api"]?.url).toBe("https://api.example.com/mcp");
    });

    it("preserves headers", () => {
      const result = transformMcpToOpenCode({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
          headers: {
            Authorization: "Bearer token",
            "X-Custom": "value",
          },
        },
      });

      expect(result?.["api"]?.headers?.["Authorization"]).toBe("Bearer token");
      expect(result?.["api"]?.headers?.["X-Custom"]).toBe("value");
    });
  });

  describe("sse servers", () => {
    it("converts to remote type", () => {
      const result = transformMcpToOpenCode({
        stream: {
          type: "sse",
          url: "https://api.example.com/sse",
        },
      });

      expect(result?.["stream"]?.type).toBe("remote");
      expect(result?.["stream"]?.url).toBe("https://api.example.com/sse");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = transformMcpToOpenCode(undefined);

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty object", () => {
      const result = transformMcpToOpenCode({});

      expect(result).toBeUndefined();
    });

    it("handles multiple servers", () => {
      const result = transformMcpToOpenCode({
        db: { command: "npx", args: ["-y", "@example/db"] },
        api: { type: "http", url: "https://api.example.com/mcp" },
        stream: { type: "sse", url: "https://api.example.com/sse" },
      });

      expect(Object.keys(result!)).toHaveLength(3);
      expect(result?.["db"]?.type).toBe("local");
      expect(result?.["api"]?.type).toBe("remote");
      expect(result?.["stream"]?.type).toBe("remote");
    });

    it("skips servers without command or type", () => {
      const result = transformMcpToOpenCode({
        invalid: { args: ["-y"] } as Record<string, unknown>,
      });

      expect(result).toBeUndefined();
    });
  });
});

describe("transformPermissionsToOpenCode", () => {
  describe("basic parsing", () => {
    it("parses Bash(git:*) format", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
    });

    it("parses Read(.env) format", () => {
      const result = transformPermissionsToOpenCode({
        deny: ["Read(.env)"],
      });

      expect(result?.["read"]?.[".env"]).toBe("deny");
    });

    it("parses Write(src/*) format", () => {
      const result = transformPermissionsToOpenCode({
        ask: ["Write(src/*)"],
      });

      expect(result?.["write"]?.["src/*"]).toBe("ask");
    });
  });

  describe("permission levels", () => {
    it("handles allow rules", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
    });

    it("handles ask rules", () => {
      const result = transformPermissionsToOpenCode({
        ask: ["Bash(npm:*)"],
      });

      expect(result?.["bash"]?.["npm *"]).toBe("ask");
    });

    it("handles deny rules", () => {
      const result = transformPermissionsToOpenCode({
        deny: ["Read(.env)"],
      });

      expect(result?.["read"]?.[".env"]).toBe("deny");
    });
  });

  describe("priority handling", () => {
    it("deny overrides ask and allow", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)"],
        ask: ["Bash(git:*)"],
        deny: ["Bash(git:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("deny");
    });

    it("ask overrides allow", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)"],
        ask: ["Bash(git:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("ask");
    });
  });

  describe("pattern transformation", () => {
    it("transforms :* to space *", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(npm:*)"],
      });

      expect(result?.["bash"]?.["npm *"]).toBe("allow");
    });

    it("handles patterns without :*", () => {
      const result = transformPermissionsToOpenCode({
        deny: ["Read(.env)"],
      });

      expect(result?.["read"]?.[".env"]).toBe("deny");
    });
  });

  describe("tool name normalization", () => {
    it("normalizes tool names to lowercase", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)"],
        deny: ["READ(.env)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
      expect(result?.["read"]?.[".env"]).toBe("deny");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = transformPermissionsToOpenCode(undefined);

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty permissions", () => {
      const result = transformPermissionsToOpenCode({});

      expect(result).toBeUndefined();
    });

    it("skips unparseable rules", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["InvalidFormat", "Bash(git:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
      expect(Object.keys(result!)).toHaveLength(1);
    });

    it("returns null for invalid rule format", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["NoParens"],
      });

      expect(result).toBeUndefined();
    });

    it("handles multiple rules for same tool", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)", "Bash(npm:*)"],
        deny: ["Bash(rm:*)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
      expect(result?.["bash"]?.["npm *"]).toBe("allow");
      expect(result?.["bash"]?.["rm *"]).toBe("deny");
    });

    it("handles complex permissions structure", () => {
      const result = transformPermissionsToOpenCode({
        allow: ["Bash(git:*)", "Write(src/*)"],
        ask: ["Bash(npm:*)", "Read(config/*)"],
        deny: ["Read(.env)", "Read(.env.local)"],
      });

      expect(result?.["bash"]?.["git *"]).toBe("allow");
      expect(result?.["bash"]?.["npm *"]).toBe("ask");
      expect(result?.["write"]?.["src/*"]).toBe("allow");
      expect(result?.["read"]?.["config/*"]).toBe("ask");
      expect(result?.["read"]?.[".env"]).toBe("deny");
      expect(result?.["read"]?.[".env.local"]).toBe("deny");
    });
  });
});
