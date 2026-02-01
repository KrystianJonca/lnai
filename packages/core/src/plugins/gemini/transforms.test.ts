import { describe, expect, it } from "vitest";

import type { MarkdownFile, RuleFrontmatter } from "../../types";
import { groupRulesByDirectory } from "../../utils/rules";
import { transformMcpToGemini } from "./transforms";

describe("transformMcpToGemini", () => {
  it("should return undefined if no mcpServers", () => {
    expect(transformMcpToGemini(undefined)).toBeUndefined();
  });

  it("should transform valid mcp servers", () => {
    const input = {
      server1: {
        command: "node",
        args: ["server.js"],
        env: { KEY: "VALUE" },
      },
      server2: {
        url: "http://localhost:3000",
      },
    };

    const expected = {
      server1: {
        command: "node",
        args: ["server.js"],
        env: { KEY: "VALUE" },
      },
      server2: {
        command: undefined,
        args: undefined,
        env: undefined,
        httpUrl: "http://localhost:3000",
      },
    };

    expect(transformMcpToGemini(input)).toEqual(expected);
  });

  it("should prioritize url as httpUrl", () => {
    const input = {
      server1: {
        command: "node",
        url: "http://localhost:3000",
      },
    };

    const expected = {
      server1: {
        command: "node",
        args: undefined,
        env: undefined,
        httpUrl: "http://localhost:3000",
      },
    };

    expect(transformMcpToGemini(input)).toEqual(expected);
  });
});

describe("groupRulesByDirectory", () => {
  it("should group rules by directory based on paths glob", () => {
    const rules: MarkdownFile<RuleFrontmatter>[] = [
      {
        path: "rule1.md",
        frontmatter: {
          paths: ["apps/cli/**/*.ts", "packages/core/src/index.ts"],
        },
        content: "Rule 1 content",
      },
      {
        path: "rule2.md",
        frontmatter: {
          paths: ["apps/cli/test.ts"],
        },
        content: "Rule 2 content",
      },
    ];

    const result = groupRulesByDirectory(rules);

    expect(result.size).toBe(2);
    expect(result.has("apps/cli")).toBe(true);
    expect(result.has("packages/core/src")).toBe(true);

    expect(result.get("apps/cli")).toHaveLength(2);
    expect(result.get("apps/cli")![0]).toContain("Rule 1 content");
    expect(result.get("apps/cli")![1]).toContain("Rule 2 content");

    expect(result.get("packages/core/src")).toHaveLength(1);
    expect(result.get("packages/core/src")![0]).toContain("Rule 1 content");
  });
});
