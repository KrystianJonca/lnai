/** Windsurf rule frontmatter with trigger mode */
export interface WindsurfRuleFrontmatter {
  trigger: "manual" | "always_on" | "model_decision" | "glob";
  globs?: string[];
  description?: string;
}
