---
title: Skills
description: Reference for reusable skill definitions
---

# Skills

Skills are reusable capabilities that can be invoked by AI tools.

## Location

```text
.ai/skills/<skill-name>/SKILL.md
```

## Format

Skills require YAML frontmatter with `name` and `description`:

```markdown
---
name: deploy
description: Deploy the application to production
---

# Deploy Skill

## Steps

1. Run the test suite
2. Build the application
3. Deploy to production environment

## Commands

\`\`\`bash
pnpm test
pnpm build
pnpm deploy:prod
\`\`\`
```

## Schema

```typescript
{
  name: string; // Required
  description: string; // Required
}
```

## Directory Structure

```text
.ai/skills/
├── deploy/
│   └── SKILL.md
├── review/
│   └── SKILL.md
└── test/
    └── SKILL.md
```

Each skill directory can contain additional files if needed.

## Export Mapping

| Tool        | Output                                         |
| ----------- | ---------------------------------------------- |
| Claude Code | `.claude/skills/<name>/` (symlink per skill)   |
| Cursor      | `.cursor/skills/<name>/` (symlink per skill)   |
| Copilot     | `.github/skills/<name>/` (symlink per skill)   |
| OpenCode    | `.agents/skills/<name>/` (symlink per skill)   |
| Windsurf    | `.windsurf/skills/<name>/` (symlink per skill) |
| Gemini CLI  | `.gemini/skills/<name>/` (symlink per skill)   |
| Codex       | `.agents/skills/<name>/` (symlink per skill)   |

:::note
All tools use symlinks to the original skill directories, preserving any additional files that may exist in the skill folder.
:::
