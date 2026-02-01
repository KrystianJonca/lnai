import { describe, expect, it } from "vitest";

import type { MarkdownFile, RuleFrontmatter } from "../types/index";
import { getDirFromGlob, groupRulesByDirectory } from "./rules";

describe("getDirFromGlob", () => {
  it("returns '.' for cwd-only globs", () => {
    expect(getDirFromGlob("*.ts")).toBe(".");
    expect(getDirFromGlob("{a,b}.md")).toBe(".");
  });

  it("strips trailing slashes and nested glob segments", () => {
    expect(getDirFromGlob("src/**/test.ts")).toBe("src");
    expect(getDirFromGlob("src/**")).toBe("src");
    expect(getDirFromGlob("src/")).toBe("src");
  });

  it("returns parent directory for explicit file paths", () => {
    expect(getDirFromGlob("packages/core/src/index.ts")).toBe(
      "packages/core/src"
    );
    expect(getDirFromGlob("README.md")).toBe(".");
  });

  it("returns '.' for leading-wildcard patterns", () => {
    expect(getDirFromGlob("*/test.ts")).toBe(".");
  });
});

describe("groupRulesByDirectory", () => {
  it("returns empty map when no rules exist", () => {
    const result = groupRulesByDirectory([]);

    expect(result.size).toBe(0);
  });

  it("groups rule content by derived directory", () => {
    const rules: MarkdownFile<RuleFrontmatter>[] = [
      {
        path: "rules/cli.md",
        frontmatter: {
          paths: ["apps/cli/**/*.ts", "*.md"],
        },
        content: "Alpha",
      },
      {
        path: "rules/docs.md",
        frontmatter: {
          paths: ["docs/**/*.md", "apps/cli/index.ts"],
        },
        content: "Beta",
      },
    ];

    const result = groupRulesByDirectory(rules);

    expect(result.size).toBe(3);
    expect(result.get("apps/cli")).toEqual([
      "## rules/cli.md\n\nAlpha\n",
      "## rules/docs.md\n\nBeta\n",
    ]);
    expect(result.get(".")).toEqual(["## rules/cli.md\n\nAlpha\n"]);
    expect(result.get("docs")).toEqual(["## rules/docs.md\n\nBeta\n"]);
  });

  it("deduplicates rules when multiple paths resolve to the same directory", () => {
    const rules: MarkdownFile<RuleFrontmatter>[] = [
      {
        path: "rules/repeat.md",
        frontmatter: {
          paths: ["src/*.ts", "src/**/*.ts"],
        },
        content: "Repeat",
      },
    ];

    const result = groupRulesByDirectory(rules);

    expect(result.get("src")).toEqual(["## rules/repeat.md\n\nRepeat\n"]);
  });
});
