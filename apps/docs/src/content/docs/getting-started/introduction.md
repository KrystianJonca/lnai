---
title: Introduction
description: Learn what LNAI is and how it helps manage AI coding tool configurations.
---

# Introduction

LNAI is a CLI tool that syncs a unified `.ai/` configuration to native formats for AI coding tools.

## The Problem

Modern developers use multiple AI coding assistants:

- Claude Code
- Codex
- Gemini CLI
- OpenCode
- Cursor
- GitHub Copilot
- Windsurf
- And more...

Each tool has its own configuration format, leading to:

- **Duplication**: Same rules defined multiple times
- **Drift**: Configurations get out of sync
- **Maintenance burden**: Updates need to be made in multiple places

## The Solution

LNAI provides a single source of truth in the `.ai/` directory that exports to native formats:

```text
.ai/
├── config.json
├── settings.json
├── AGENTS.md
├── rules/*.md
├── skills/<name>/SKILL.md
├── .claude/   (overrides)
├── .codex/    (overrides)
├── .cursor/   (overrides)
├── .gemini/   (overrides)
├── .opencode/ (overrides)
├── .copilot/  (overrides)
└── .windsurf/ (overrides)

Outputs:
- AGENTS.md (root)
- .claude/ (CLAUDE.md, settings.json, rules/, skills/)
- .codex/ (config.toml, skills/)
- .cursor/ (rules/*.mdc, mcp.json, cli.json)
- .gemini/ (GEMINI.md, settings.json, skills/) + <dir>/GEMINI.md
- .opencode/ (rules/, skills/) + opencode.json
- .github/ (copilot-instructions.md, instructions/, skills/)
- .windsurf/ (rules/, skills/)
```

## Releases

See the [GitHub releases](https://github.com/KrystianJonca/lnai/releases) for the full changelog.
