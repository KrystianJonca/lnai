import matter from "gray-matter";

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const parsed = matter(content);
  return {
    frontmatter: parsed.data as Record<string, unknown>,
    content: parsed.content.trim(),
  };
}
