import { describe, expect, it } from "vitest";

import type { MarkdownFile, RuleFrontmatter } from "../../types/index";
import {
  deriveDescription,
  serializeCopilotInstruction,
  transformEnvVarToCopilot,
  transformMcpToCopilot,
  transformRuleToCopilot,
} from "./transforms";

describe("transformRuleToCopilot", () => {
  it("transforms multiple paths to comma-separated applyTo", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["**/*.ts", "**/*.tsx"] },
      content: "# TypeScript Rules\n\nUse strict TypeScript.",
    };

    const result = transformRuleToCopilot(rule);

    expect(result.frontmatter.applyTo).toBe("**/*.ts,**/*.tsx");
  });

  it("transforms single path to applyTo", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["src/**/*.ts"] },
      content: "# TypeScript Rules",
    };

    const result = transformRuleToCopilot(rule);

    expect(result.frontmatter.applyTo).toBe("src/**/*.ts");
  });

  it("derives description from first H1 heading", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["*.ts"] },
      content: "# TypeScript Coding Standards\n\nUse strict mode.",
    };

    const result = transformRuleToCopilot(rule);

    expect(result.frontmatter.description).toBe("TypeScript Coding Standards");
  });

  it("omits applyTo when no paths (global rule)", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "general.md",
      frontmatter: { paths: [] },
      content: "# General Rules",
    };

    const result = transformRuleToCopilot(rule);

    expect(result.frontmatter.applyTo).toBeUndefined();
  });

  it("preserves original content", () => {
    const content = "# Rules\n\n- Rule 1\n- Rule 2";
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "rules.md",
      frontmatter: { paths: ["*.ts"] },
      content,
    };

    const result = transformRuleToCopilot(rule);

    expect(result.content).toBe(content);
  });
});

describe("deriveDescription (reused from cursor)", () => {
  it("extracts first H1 heading", () => {
    const content = "# My Awesome Rules\n\nSome content here.";

    const result = deriveDescription("rules.md", content);

    expect(result).toBe("My Awesome Rules");
  });

  it("falls back to formatted filename when no H1", () => {
    const content = "Some content without heading.";

    const result = deriveDescription("code-organization.md", content);

    expect(result).toBe("Code Organization");
  });
});

describe("serializeCopilotInstruction", () => {
  it("generates valid YAML frontmatter with applyTo", () => {
    const frontmatter = {
      applyTo: "**/*.ts,**/*.tsx",
      description: "TypeScript Rules",
    };
    const content = "# Rules\n\nContent here.";

    const result = serializeCopilotInstruction(frontmatter, content);

    expect(result).toContain("---");
    expect(result).toContain('applyTo: "**/*.ts,**/*.tsx"');
    expect(result).toContain('description: "TypeScript Rules"');
    expect(result).toContain("# Rules\n\nContent here.");
  });

  it("omits applyTo when not provided", () => {
    const frontmatter = {
      description: "General Rules",
    };
    const content = "# General";

    const result = serializeCopilotInstruction(frontmatter, content);

    expect(result).not.toContain("applyTo:");
    expect(result).toContain('description: "General Rules"');
  });

  it("escapes special characters in values", () => {
    const frontmatter = {
      description: 'Rules with "quotes" and stuff',
    };
    const content = "Content";

    const result = serializeCopilotInstruction(frontmatter, content);

    expect(result).toContain('description: "Rules with \\"quotes\\" and stuff"');
  });

  it("produces correctly formatted output structure", () => {
    const frontmatter = {
      applyTo: "*.ts",
      description: "Test",
    };
    const content = "Body content";

    const result = serializeCopilotInstruction(frontmatter, content);

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("Body content");
    // Second "---" should be before empty line and content
    const secondDashIndex = lines.indexOf("---", 1);
    expect(secondDashIndex).toBeGreaterThan(0);
    expect(lines[secondDashIndex + 1]).toBe("");
  });
});

describe("transformMcpToCopilot", () => {
  describe("stdio servers", () => {
    it("converts command/args format with explicit type: stdio", () => {
      const result = transformMcpToCopilot({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
        },
      });

      expect(result?.servers["db"]).toEqual({
        type: "stdio",
        command: "npx",
        args: ["-y", "@example/db"],
      });
    });

    it("handles command without args", () => {
      const result = transformMcpToCopilot({
        simple: {
          command: "node",
        },
      });

      expect(result?.servers["simple"]).toEqual({
        type: "stdio",
        command: "node",
      });
    });

    it("transforms environment variables to Copilot format", () => {
      const result = transformMcpToCopilot({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
          env: {
            DB_URL: "${DB_URL}",
            API_KEY: "${API_KEY:-default}",
          },
        },
      });

      const server = result?.servers["db"] as { env: Record<string, string> };
      expect(server.env["DB_URL"]).toBe("${env:DB_URL}");
      expect(server.env["API_KEY"]).toBe("${env:API_KEY}");
    });

    it("preserves regular env values", () => {
      const result = transformMcpToCopilot({
        db: {
          command: "npx",
          env: {
            NODE_ENV: "production",
            DB_URL: "${DB_URL}",
          },
        },
      });

      const server = result?.servers["db"] as { env: Record<string, string> };
      expect(server.env["NODE_ENV"]).toBe("production");
      expect(server.env["DB_URL"]).toBe("${env:DB_URL}");
    });
  });

  describe("http servers", () => {
    it("converts to remote server format with url", () => {
      const result = transformMcpToCopilot({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
        },
      });

      expect(result?.servers["api"]).toEqual({
        url: "https://api.example.com/mcp",
      });
    });

    it("wraps headers in requestInit", () => {
      const result = transformMcpToCopilot({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
          headers: {
            Authorization: "Bearer ${API_TOKEN}",
            "X-Custom": "static-value",
          },
        },
      });

      expect(result?.servers["api"]).toEqual({
        url: "https://api.example.com/mcp",
        requestInit: {
          headers: {
            Authorization: "Bearer ${env:API_TOKEN}",
            "X-Custom": "static-value",
          },
        },
      });
    });
  });

  describe("sse servers", () => {
    it("converts to remote server format (same as http)", () => {
      const result = transformMcpToCopilot({
        stream: {
          type: "sse",
          url: "https://api.example.com/sse",
        },
      });

      expect(result?.servers["stream"]).toEqual({
        url: "https://api.example.com/sse",
      });
    });
  });

  describe("output structure", () => {
    it("wraps servers in inputs/servers structure", () => {
      const result = transformMcpToCopilot({
        db: { command: "npx" },
      });

      expect(result?.inputs).toEqual([]);
      expect(result?.servers).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = transformMcpToCopilot(undefined);

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty object", () => {
      const result = transformMcpToCopilot({});

      expect(result).toBeUndefined();
    });

    it("handles multiple servers", () => {
      const result = transformMcpToCopilot({
        db: { command: "npx", args: ["-y", "@example/db"] },
        api: { type: "http", url: "https://api.example.com/mcp" },
        stream: { type: "sse", url: "https://api.example.com/sse" },
      });

      expect(Object.keys(result!.servers)).toHaveLength(3);
      expect((result?.servers["db"] as { type: string }).type).toBe("stdio");
      expect((result?.servers["api"] as { url: string }).url).toBe(
        "https://api.example.com/mcp"
      );
      expect((result?.servers["stream"] as { url: string }).url).toBe(
        "https://api.example.com/sse"
      );
    });

    it("skips servers without command or type", () => {
      const result = transformMcpToCopilot({
        invalid: { args: ["-y"] } as Record<string, unknown>,
      });

      expect(result).toBeUndefined();
    });
  });
});

describe("transformEnvVarToCopilot", () => {
  it("transforms ${VAR} to ${env:VAR}", () => {
    expect(transformEnvVarToCopilot("${DB_URL}")).toBe("${env:DB_URL}");
  });

  it("transforms ${VAR:-default} to ${env:VAR}", () => {
    expect(transformEnvVarToCopilot("${API_KEY:-default}")).toBe(
      "${env:API_KEY}"
    );
  });

  it("preserves regular values", () => {
    expect(transformEnvVarToCopilot("production")).toBe("production");
  });

  it("handles mixed content", () => {
    expect(transformEnvVarToCopilot("Bearer ${TOKEN}")).toBe(
      "Bearer ${env:TOKEN}"
    );
  });

  it("handles multiple variables", () => {
    expect(transformEnvVarToCopilot("${HOST}:${PORT}")).toBe(
      "${env:HOST}:${env:PORT}"
    );
  });
});
