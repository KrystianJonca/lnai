import * as fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { getFixturePath } from "../__tests__/utils";
import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("parses valid YAML frontmatter", () => {
    const content = `---
name: test
description: A test file
---

# Content

This is the content.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({
      name: "test",
      description: "A test file",
    });
    expect(result.content).toBe("# Content\n\nThis is the content.");
  });

  it("returns empty object for no frontmatter", () => {
    const content = `# No Frontmatter

Just plain markdown content.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(
      "# No Frontmatter\n\nJust plain markdown content."
    );
  });

  it("returns empty object for empty frontmatter", () => {
    const content = `---
---

# Content`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("# Content");
  });

  it("parses complex frontmatter with nested objects and arrays", () => {
    const content = `---
name: complex
config:
  nested:
    value: true
  array:
    - item1
    - item2
paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"
---

# Complex Content`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({
      name: "complex",
      config: {
        nested: { value: true },
        array: ["item1", "item2"],
      },
      paths: ["src/**/*.ts", "lib/**/*.ts"],
    });
    expect(result.content).toBe("# Complex Content");
  });

  it("preserves multiline markdown content", () => {
    const content = `---
title: Multi
---

# First Section

Paragraph one.

## Second Section

- List item 1
- List item 2

\`\`\`typescript
const x = 1;
\`\`\``;

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({ title: "Multi" });
    expect(result.content).toContain("# First Section");
    expect(result.content).toContain("## Second Section");
    expect(result.content).toContain("- List item 1");
    expect(result.content).toContain("const x = 1;");
  });

  it("handles frontmatter with special characters", () => {
    // Note: In YAML double-quoted strings, backslashes are escape sequences
    // Use single quotes for literal backslashes, or escape them with \\
    const content = `---
name: "test: with colon"
description: 'single quotes'
path: 'C:\\Users\\test'
url: "https://example.com?foo=bar&baz=qux"
---

Content`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter["name"]).toBe("test: with colon");
    expect(result.frontmatter["description"]).toBe("single quotes");
    expect(result.frontmatter["path"]).toBe("C:\\Users\\test");
    expect(result.frontmatter["url"]).toBe(
      "https://example.com?foo=bar&baz=qux"
    );
  });

  it("parses fixture: valid-rule.md", async () => {
    const fixturePath = getFixturePath("markdown", "valid-rule.md");
    const content = await fs.readFile(fixturePath, "utf-8");

    const result = parseFrontmatter(content);

    expect(result.frontmatter["paths"]).toEqual(["src/**/*.ts", "lib/**/*.ts"]);
    expect(result.content).toContain("# TypeScript Code Rules");
  });

  it("parses fixture: valid-skill.md", async () => {
    const fixturePath = getFixturePath("markdown", "valid-skill.md");
    const content = await fs.readFile(fixturePath, "utf-8");

    const result = parseFrontmatter(content);

    expect(result.frontmatter["name"]).toBe("test-skill");
    expect(result.frontmatter["description"]).toBe(
      "A test skill for testing purposes"
    );
    expect(result.content).toContain("# Test Skill");
  });

  it("parses fixture: no-frontmatter.md", async () => {
    const fixturePath = getFixturePath("markdown", "no-frontmatter.md");
    const content = await fs.readFile(fixturePath, "utf-8");

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toContain("# No Frontmatter");
  });
});
