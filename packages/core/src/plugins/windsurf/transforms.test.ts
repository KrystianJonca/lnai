import { describe, expect, it } from "vitest";

import type { MarkdownFile, RuleFrontmatter } from "../../types/index";
import {
  serializeWindsurfRule,
  transformRuleToWindsurf,
  type WindsurfRuleFrontmatter,
} from "./transforms";

describe("transformRuleToWindsurf", () => {
  it("transforms rule with paths to manual trigger", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "typescript.md",
      frontmatter: { paths: ["**/*.ts", "**/*.tsx"] },
      content: "Use TypeScript best practices.",
    };

    const result = transformRuleToWindsurf(rule);

    expect(result.frontmatter.trigger).toBe("manual");
    expect(result.content).toBe("Use TypeScript best practices.");
  });

  it("preserves rule content", () => {
    const rule: MarkdownFile<RuleFrontmatter> = {
      path: "testing.md",
      frontmatter: { paths: ["**/*.test.ts"] },
      content: "# Testing Guidelines\n\nWrite comprehensive tests.",
    };

    const result = transformRuleToWindsurf(rule);

    expect(result.content).toBe("# Testing Guidelines\n\nWrite comprehensive tests.");
  });
});

describe("serializeWindsurfRule", () => {
  it("serializes rule with manual trigger", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "manual",
    };
    const content = "Follow coding standards.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      "---\ntrigger: manual\n---\n\nFollow coding standards."
    );
  });

  it("serializes rule with glob trigger and globs", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "glob",
      globs: ["**/*.ts", "**/*.tsx"],
    };
    const content = "TypeScript rules.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      "---\ntrigger: glob\nglobs:\n  - **/*.ts\n  - **/*.tsx\n---\n\nTypeScript rules."
    );
  });

  it("serializes rule with description", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "model_decision",
      description: "Apply when working with API routes",
    };
    const content = "API guidelines.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      '---\ntrigger: model_decision\ndescription: "Apply when working with API routes"\n---\n\nAPI guidelines.'
    );
  });

  it("serializes rule with all fields", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "glob",
      globs: ["src/**/*.ts"],
      description: "Source file rules",
    };
    const content = "Source rules.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      '---\ntrigger: glob\nglobs:\n  - src/**/*.ts\ndescription: "Source file rules"\n---\n\nSource rules.'
    );
  });

  it("escapes special YAML characters in description", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "model_decision",
      description: 'API: routes with "quotes" and # comments',
    };
    const content = "API guidelines.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      '---\ntrigger: model_decision\ndescription: "API: routes with \\"quotes\\" and # comments"\n---\n\nAPI guidelines.'
    );
  });

  it("handles multiline content", () => {
    const frontmatter: WindsurfRuleFrontmatter = {
      trigger: "manual",
    };
    const content = "# Header\n\nParagraph 1.\n\nParagraph 2.";

    const result = serializeWindsurfRule(frontmatter, content);

    expect(result).toBe(
      "---\ntrigger: manual\n---\n\n# Header\n\nParagraph 1.\n\nParagraph 2."
    );
  });
});
