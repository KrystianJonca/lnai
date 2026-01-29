---
title: AGENTS.md
description: Reference for the shared AI instructions file
---

# AGENTS.md

The main instructions file that provides context and guidelines to AI coding tools.

## Location

```text
.ai/AGENTS.md
```

## Purpose

AGENTS.md contains project-specific instructions that help AI tools understand:

- Project structure and architecture
- Coding conventions and style guidelines
- Technology stack and dependencies
- Domain-specific knowledge

## Format

Standard Markdown with no required frontmatter.

## Example

```markdown
# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use ESM imports
- Prefer `const` over `let`
- Use async/await over callbacks

## Architecture

- `apps/` - Application packages
- `packages/` - Shared libraries

## Commands

| Command      | Description              |
| ------------ | ------------------------ |
| `pnpm dev`   | Start development server |
| `pnpm build` | Build for production     |
| `pnpm test`  | Run tests                |
```

## Export Mapping

| Tool        | Output File                               |
| ----------- | ----------------------------------------- |
| Claude Code | `.claude/CLAUDE.md` (symlink)             |
| Cursor      | `AGENTS.md` at project root (symlink)     |
| Copilot     | `.github/copilot-instructions.md` (symlink) |
| OpenCode    | `.opencode/AGENTS.md` (symlink)           |
