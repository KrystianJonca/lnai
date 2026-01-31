import { describe, expect, it } from "vitest";

import type { MarkdownFile, RuleFrontmatter } from "../../types/index";
import { deriveDescription, transformEnvVar } from "../../utils/transforms";
import {
  serializeCursorRule,
  transformMcpToCursor,
  transformPermissionRule,
  transformPermissionsToCursor,
  transformRuleToCursor,
} from "./transforms";

describe("transformRuleToCursor", () => {
  it("transforms paths to globs", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["src/**/*.ts", "packages/**/*.ts"] },
      content: "# TypeScript Rules\n\nUse strict TypeScript.",
    };

    const result = transformRuleToCursor(rule);

    expect(result.frontmatter.globs).toEqual([
      "src/**/*.ts",
      "packages/**/*.ts",
    ]);
  });

  it("derives description from first H1 heading", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["*.ts"] },
      content: "# TypeScript Coding Standards\n\nUse strict mode.",
    };

    const result = transformRuleToCursor(rule);

    expect(result.frontmatter.description).toBe("TypeScript Coding Standards");
  });

  it("sets alwaysApply to false when paths exist", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["*.ts"] },
      content: "# TypeScript",
    };

    const result = transformRuleToCursor(rule);

    expect(result.frontmatter.alwaysApply).toBe(false);
  });

  it("sets alwaysApply to true when no paths", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "general.md",
      frontmatter: { paths: [] },
      content: "# General Rules",
    };

    const result = transformRuleToCursor(rule);

    expect(result.frontmatter.alwaysApply).toBe(true);
    expect(result.frontmatter.globs).toEqual([]);
  });

  it("preserves original content", () => {
    const content = "# Rules\n\n- Rule 1\n- Rule 2";
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "rules.md",
      frontmatter: { paths: ["*.ts"] },
      content,
    };

    const result = transformRuleToCursor(rule);

    expect(result.content).toBe(content);
  });
});

describe("deriveDescription", () => {
  it("extracts first H1 heading", () => {
    const content = "# My Awesome Rules\n\nSome content here.";

    const result = deriveDescription("rules.md", content);

    expect(result).toBe("My Awesome Rules");
  });

  it("handles H1 heading with special characters", () => {
    const content = "# TypeScript & JavaScript Rules\n\nContent.";

    const result = deriveDescription("rules.md", content);

    expect(result).toBe("TypeScript & JavaScript Rules");
  });

  it("ignores H2 and other headings", () => {
    const content = "## This is H2\n\n### This is H3";

    const result = deriveDescription("my-rules.md", content);

    expect(result).toBe("My Rules");
  });

  it("falls back to formatted filename when no H1", () => {
    const content = "Some content without heading.";

    const result = deriveDescription("code-organization.md", content);

    expect(result).toBe("Code Organization");
  });

  it("handles filename without extension", () => {
    const content = "No heading.";

    const result = deriveDescription("my-special-rules", content);

    expect(result).toBe("My Special Rules");
  });

  it("handles single word filename", () => {
    const content = "No heading.";

    const result = deriveDescription("typescript.md", content);

    expect(result).toBe("Typescript");
  });
});

describe("serializeCursorRule", () => {
  it("generates valid YAML frontmatter with globs", () => {
    const frontmatter = {
      description: "TypeScript Rules",
      globs: ["src/**/*.ts", "packages/**/*.ts"],
      alwaysApply: false,
    };
    const content = "# Rules\n\nContent here.";

    const result = serializeCursorRule(frontmatter, content);

    expect(result).toContain("---");
    expect(result).toContain('description: "TypeScript Rules"');
    expect(result).toContain("globs:");
    expect(result).toContain('  - "src/**/*.ts"');
    expect(result).toContain('  - "packages/**/*.ts"');
    expect(result).toContain("alwaysApply: false");
    expect(result).toContain("# Rules\n\nContent here.");
  });

  it("generates empty globs array when no globs", () => {
    const frontmatter = {
      description: "General Rules",
      globs: [],
      alwaysApply: true,
    };
    const content = "# General";

    const result = serializeCursorRule(frontmatter, content);

    expect(result).toContain("globs:\nalwaysApply: true");
  });

  it("escapes special characters in description", () => {
    const frontmatter = {
      description: 'Rules with "quotes" and stuff',
      globs: [],
      alwaysApply: true,
    };
    const content = "Content";

    const result = serializeCursorRule(frontmatter, content);

    expect(result).toContain(
      'description: "Rules with \\"quotes\\" and stuff"'
    );
  });

  it("produces correctly formatted output structure", () => {
    const frontmatter = {
      description: "Test",
      globs: ["*.ts"],
      alwaysApply: false,
    };
    const content = "Body content";

    const result = serializeCursorRule(frontmatter, content);

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("Body content");
    // Second "---" should be before empty line and content
    const secondDashIndex = lines.indexOf("---", 1);
    expect(secondDashIndex).toBeGreaterThan(0);
    expect(lines[secondDashIndex + 1]).toBe("");
  });
});

describe("transformMcpToCursor", () => {
  describe("stdio servers", () => {
    it("converts command/args format", () => {
      const result = transformMcpToCursor({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
        },
      });

      expect(result?.["db"]?.command).toBe("npx");
      expect(result?.["db"]?.args).toEqual(["-y", "@example/db"]);
    });

    it("handles command without args", () => {
      const result = transformMcpToCursor({
        simple: {
          command: "node",
        },
      });

      expect(result?.["simple"]?.command).toBe("node");
      expect(result?.["simple"]?.args).toBeUndefined();
    });

    it("transforms environment variables to Cursor format", () => {
      const result = transformMcpToCursor({
        db: {
          command: "npx",
          args: ["-y", "@example/db"],
          env: {
            DB_URL: "${DB_URL}",
            API_KEY: "${API_KEY:-default}",
          },
        },
      });

      expect(result?.["db"]?.env?.["DB_URL"]).toBe("${env:DB_URL}");
      expect(result?.["db"]?.env?.["API_KEY"]).toBe("${env:API_KEY}");
    });

    it("preserves regular env values", () => {
      const result = transformMcpToCursor({
        db: {
          command: "npx",
          env: {
            NODE_ENV: "production",
            DB_URL: "${DB_URL}",
          },
        },
      });

      expect(result?.["db"]?.env?.["NODE_ENV"]).toBe("production");
      expect(result?.["db"]?.env?.["DB_URL"]).toBe("${env:DB_URL}");
    });
  });

  describe("http servers", () => {
    it("converts to url-based format", () => {
      const result = transformMcpToCursor({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
        },
      });

      expect(result?.["api"]?.url).toBe("https://api.example.com/mcp");
      expect(result?.["api"]?.command).toBeUndefined();
    });

    it("preserves and transforms headers", () => {
      const result = transformMcpToCursor({
        api: {
          type: "http",
          url: "https://api.example.com/mcp",
          headers: {
            Authorization: "Bearer ${API_TOKEN}",
            "X-Custom": "static-value",
          },
        },
      });

      expect(result?.["api"]?.headers?.["Authorization"]).toBe(
        "Bearer ${env:API_TOKEN}"
      );
      expect(result?.["api"]?.headers?.["X-Custom"]).toBe("static-value");
    });
  });

  describe("sse servers", () => {
    it("converts to url-based format", () => {
      const result = transformMcpToCursor({
        stream: {
          type: "sse",
          url: "https://api.example.com/sse",
        },
      });

      expect(result?.["stream"]?.url).toBe("https://api.example.com/sse");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = transformMcpToCursor(undefined);

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty object", () => {
      const result = transformMcpToCursor({});

      expect(result).toBeUndefined();
    });

    it("handles multiple servers", () => {
      const result = transformMcpToCursor({
        db: { command: "npx", args: ["-y", "@example/db"] },
        api: { type: "http", url: "https://api.example.com/mcp" },
        stream: { type: "sse", url: "https://api.example.com/sse" },
      });

      expect(Object.keys(result!)).toHaveLength(3);
      expect(result?.["db"]?.command).toBe("npx");
      expect(result?.["api"]?.url).toBe("https://api.example.com/mcp");
      expect(result?.["stream"]?.url).toBe("https://api.example.com/sse");
    });

    it("skips servers without command or type", () => {
      const result = transformMcpToCursor({
        invalid: { args: ["-y"] } as Record<string, unknown>,
      });

      expect(result).toBeUndefined();
    });
  });
});

describe("transformEnvVar for cursor format", () => {
  it("transforms ${VAR} to ${env:VAR}", () => {
    expect(transformEnvVar("${DB_URL}", "cursor")).toBe("${env:DB_URL}");
  });

  it("transforms ${VAR:-default} to ${env:VAR}", () => {
    expect(transformEnvVar("${API_KEY:-default}", "cursor")).toBe(
      "${env:API_KEY}"
    );
  });

  it("preserves regular values", () => {
    expect(transformEnvVar("production", "cursor")).toBe("production");
  });

  it("handles mixed content", () => {
    expect(transformEnvVar("Bearer ${TOKEN}", "cursor")).toBe(
      "Bearer ${env:TOKEN}"
    );
  });

  it("handles multiple variables", () => {
    expect(transformEnvVar("${HOST}:${PORT}", "cursor")).toBe(
      "${env:HOST}:${env:PORT}"
    );
  });
});

describe("transformPermissionsToCursor", () => {
  describe("tool name transformation", () => {
    it("transforms Bash to Shell", () => {
      const result = transformPermissionsToCursor({
        allow: ["Bash(git:*)"],
      });

      expect(result.permissions?.allow).toContain("Shell(git)");
    });

    it("preserves Read tool name", () => {
      const result = transformPermissionsToCursor({
        deny: ["Read(.env)"],
      });

      expect(result.permissions?.deny).toContain("Read(.env)");
    });

    it("preserves Write tool name", () => {
      const result = transformPermissionsToCursor({
        allow: ["Write(src/*)"],
      });

      expect(result.permissions?.allow).toContain("Write(src/*)");
    });
  });

  describe("pattern transformation", () => {
    it("removes :* suffix from patterns", () => {
      const result = transformPermissionsToCursor({
        allow: ["Bash(git:*)"],
      });

      expect(result.permissions?.allow).toContain("Shell(git)");
    });

    it("preserves patterns without :*", () => {
      const result = transformPermissionsToCursor({
        deny: ["Read(.env)"],
      });

      expect(result.permissions?.deny).toContain("Read(.env)");
    });

    it("preserves glob patterns", () => {
      const result = transformPermissionsToCursor({
        allow: ["Read(src/**/*.ts)"],
      });

      expect(result.permissions?.allow).toContain("Read(src/**/*.ts)");
    });
  });

  describe("ask permissions handling", () => {
    it("maps ask to allow", () => {
      const result = transformPermissionsToCursor({
        ask: ["Bash(npm:*)"],
      });

      expect(result.permissions?.allow).toContain("Shell(npm)");
      expect(result.permissions?.deny).toHaveLength(0);
    });

    it("sets hasAskPermissions flag when ask rules exist", () => {
      const result = transformPermissionsToCursor({
        ask: ["Bash(npm:*)"],
      });

      expect(result.hasAskPermissions).toBe(true);
    });

    it("hasAskPermissions is false when no ask rules", () => {
      const result = transformPermissionsToCursor({
        allow: ["Bash(git:*)"],
        deny: ["Read(.env)"],
      });

      expect(result.hasAskPermissions).toBe(false);
    });
  });

  describe("permission levels", () => {
    it("handles allow rules", () => {
      const result = transformPermissionsToCursor({
        allow: ["Bash(git:*)", "Read(src/*)"],
      });

      expect(result.permissions?.allow).toHaveLength(2);
      expect(result.permissions?.allow).toContain("Shell(git)");
      expect(result.permissions?.allow).toContain("Read(src/*)");
    });

    it("handles deny rules", () => {
      const result = transformPermissionsToCursor({
        deny: ["Read(.env)", "Read(.env.local)"],
      });

      expect(result.permissions?.deny).toHaveLength(2);
      expect(result.permissions?.deny).toContain("Read(.env)");
      expect(result.permissions?.deny).toContain("Read(.env.local)");
    });

    it("handles mixed allow, ask, and deny", () => {
      const result = transformPermissionsToCursor({
        allow: ["Bash(git:*)"],
        ask: ["Bash(npm:*)"],
        deny: ["Read(.env)"],
      });

      expect(result.permissions?.allow).toContain("Shell(git)");
      expect(result.permissions?.allow).toContain("Shell(npm)");
      expect(result.permissions?.deny).toContain("Read(.env)");
      expect(result.hasAskPermissions).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns undefined permissions for undefined input", () => {
      const result = transformPermissionsToCursor(undefined);

      expect(result.permissions).toBeUndefined();
      expect(result.hasAskPermissions).toBe(false);
    });

    it("returns undefined permissions for empty object", () => {
      const result = transformPermissionsToCursor({});

      expect(result.permissions).toBeUndefined();
    });

    it("skips unparseable rules", () => {
      const result = transformPermissionsToCursor({
        allow: ["InvalidFormat", "Bash(git:*)"],
      });

      expect(result.permissions?.allow).toHaveLength(1);
      expect(result.permissions?.allow).toContain("Shell(git)");
    });

    it("returns undefined permissions when all rules are invalid", () => {
      const result = transformPermissionsToCursor({
        allow: ["InvalidFormat"],
      });

      expect(result.permissions).toBeUndefined();
    });
  });
});

describe("transformPermissionRule", () => {
  it("transforms Bash(git:*) to Shell(git)", () => {
    expect(transformPermissionRule("Bash(git:*)")).toBe("Shell(git)");
  });

  it("transforms Bash(npm:*) to Shell(npm)", () => {
    expect(transformPermissionRule("Bash(npm:*)")).toBe("Shell(npm)");
  });

  it("preserves Read rules", () => {
    expect(transformPermissionRule("Read(.env)")).toBe("Read(.env)");
  });

  it("preserves Write rules", () => {
    expect(transformPermissionRule("Write(src/*)")).toBe("Write(src/*)");
  });

  it("handles glob patterns", () => {
    expect(transformPermissionRule("Read(src/**/*.ts)")).toBe(
      "Read(src/**/*.ts)"
    );
  });

  it("returns null for invalid format", () => {
    expect(transformPermissionRule("InvalidFormat")).toBeNull();
  });

  it("returns null for empty parentheses", () => {
    expect(transformPermissionRule("Bash()")).toBeNull();
  });
});
