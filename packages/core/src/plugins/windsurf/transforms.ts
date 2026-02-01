import type { MarkdownFile, RuleFrontmatter } from "../../types/index";
import type { WindsurfRuleFrontmatter } from "./types";

export type { WindsurfRuleFrontmatter } from "./types";

/**
 * Transform LNAI rule to Windsurf rule format.
 * LNAI rules always have paths, but we use manual trigger mode.
 */
export function transformRuleToWindsurf(rule: MarkdownFile<RuleFrontmatter>): {
  frontmatter: WindsurfRuleFrontmatter;
  content: string;
} {
  const frontmatter: WindsurfRuleFrontmatter = {
    trigger: "manual",
  };

  return {
    frontmatter,
    content: rule.content,
  };
}

/**
 * Serialize Windsurf rule to markdown with YAML frontmatter.
 */
export function serializeWindsurfRule(
  frontmatter: WindsurfRuleFrontmatter,
  content: string
): string {
  const lines: string[] = ["---"];

  lines.push(`trigger: ${frontmatter.trigger}`);

  if (frontmatter.globs && frontmatter.globs.length > 0) {
    lines.push("globs:");
    for (const glob of frontmatter.globs) {
      lines.push(`  - ${glob}`);
    }
  }

  if (frontmatter.description) {
    // Quote description to handle special YAML characters (colons, #, quotes, etc.)
    const escaped = frontmatter.description
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    lines.push(`description: "${escaped}"`);
  }

  lines.push("---");
  lines.push("");
  lines.push(content);

  return lines.join("\n");
}
