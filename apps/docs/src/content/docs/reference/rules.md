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

| Tool        | Output                                                    |
| ----------- | --------------------------------------------------------- |
| Claude Code | `.claude/rules/` (symlink to directory)                   |
| Cursor      | `.cursor/rules/<name>.mdc` (generated, transformed)       |
| Copilot     | `.github/instructions/<name>.instructions.md` (generated) |
| OpenCode    | `.opencode/rules/` (symlink to directory)                 |
| Windsurf    | `.windsurf/rules/<name>.md` (generated, transformed)      |
| Gemini CLI  | `<dir>/GEMINI.md` (generated, grouped by directory)       |
| Codex       | `<dir>/AGENTS.md` (generated, grouped by directory)       |

### Format Differences

- **Claude Code & OpenCode**: Symlink entire rules directory — rules are used as-is
- **Cursor**: Transforms rules to `.mdc` format with Cursor-specific frontmatter (`description`, `globs`, `alwaysApply`)
- **Copilot**: Transforms rules to `.instructions.md` format with Copilot-specific frontmatter (`applyTo`, `description`)
- **Windsurf**: Transforms rules to `.md` format with `trigger: manual` frontmatter
- **Gemini CLI & Codex**: Groups rules by directory from their `paths` globs and combines them into per-directory files (`GEMINI.md` or `AGENTS.md`)
