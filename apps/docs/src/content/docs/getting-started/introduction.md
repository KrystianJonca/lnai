---
title: Introduction
description: Learn what LNAI is and how it helps manage AI coding tool configurations.
---

# Introduction

LNAI is a CLI tool that syncs a unified `.ai/` configuration to native formats for AI coding tools.

## The Problem

Modern developers use multiple AI coding assistants:

- Claude Code
- OpenCode
- Cursor
- GitHub Copilot
- And more...

Each tool has its own configuration format, leading to:

- **Duplication**: Same rules defined multiple times
- **Drift**: Configurations get out of sync
- **Maintenance burden**: Updates need to be made in multiple places

## The Solution

LNAI provides a single source of truth in the `.ai/` directory that exports to native formats:

```text
.ai/                              →    .claude/
├── config.json                        ├── CLAUDE.md
├── settings.json                      ├── settings.json
├── AGENTS.md                          ├── rules/
├── rules/*.md                         └── skills/
├── skills/<name>/SKILL.md       →    .cursor/
├── .claude/  (overrides)              ├── rules/*.mdc
├── .cursor/  (overrides)              ├── mcp.json
├── .opencode/ (overrides)             └── cli.json
└── .copilot/ (overrides)        →    .opencode/
                                       ├── AGENTS.md
                                       ├── rules/
                                       └── skills/
                                  →    opencode.json
                                  →    .github/
                                       ├── copilot-instructions.md
                                       ├── instructions/*.instructions.md
                                       └── skills/
                                  →    .vscode/mcp.json
```

## Releases

See the [GitHub releases](https://github.com/KrystianJonca/lnai/releases) for the full changelog.
