---
title: Rules
description: Reference for path-specific rule files
---

# Rules

Rules are path-specific instructions that apply to certain files or directories.

## Location

```text
.ai/rules/*.md
```

## Format

Rules require YAML frontmatter with a `paths` array:

```markdown
---
paths:
  - "src/components/**/*.tsx"
---

# Component Guidelines

Components in this directory should:

- Use functional components with hooks
- Export a default component
- Include TypeScript interfaces
```

## Schema

```typescript
{
  paths: string[]  // Required, minimum 1 path
}
```

### Path Patterns

| Pattern        | Matches                   |
| -------------- | ------------------------- |
| `src/**/*.ts`  | All `.ts` files in `src/` |
| `*.config.js`  | Config files in root      |
| `**/*.test.ts` | All test files            |

## Export Mapping

| Tool        | Output                                    |
| ----------- | ----------------------------------------- |
| Claude Code | `.claude/rules/` (symlink to directory)   |
| OpenCode    | `.opencode/rules/` (symlink to directory) |
