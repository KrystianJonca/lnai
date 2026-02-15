---
title: Version Control
description: What to commit and what to gitignore when using LNAI
---

# Version Control

LNAI generates tool-specific configuration files from your `.ai/` source directory. This page explains what to commit and what to ignore.

## What to commit

The `.ai/` directory is your source of truth. Commit it so your team shares the same configuration:

```
.ai/
├── config.json        # Tool enable/disable settings
├── settings.json      # Permissions, MCP servers
├── AGENTS.md          # Project guidelines
├── rules/             # Coding rules
├── context/           # Project context files
└── skills/            # Skill definitions
```

## What to gitignore

Generated tool directories (`.claude/`, `.cursor/`, `.github/`, etc.) are output files that `lnai sync` recreates on demand. By default, they should not be committed.

### Automatic `.gitignore` management

When you run `lnai sync`, LNAI automatically manages a section in your `.gitignore`:

```txt
# lnai-generated
.claude/CLAUDE.md
.claude/rules
.cursor/rules/typescript.mdc
.ai/.lnai-manifest.json
# end lnai-generated
```

This section is updated on every sync — stale entries are removed and new ones are added. You do not need to edit it manually.

### `.lnai-manifest.json`

The file `.ai/.lnai-manifest.json` is a local cache that tracks which files LNAI has generated. It contains timestamps that change on every sync, so it is always added to `.gitignore` automatically. You do not need to commit it.

## Per-tool version control

If you want to commit generated files for a specific tool (e.g. cloud-based workflows need them), set `versionControl: true` in `.ai/config.json`:

```json
{
  "tools": {
    "claudeCode": {
      "enabled": true,
      "versionControl": true
    },
    "cursor": {
      "enabled": true,
      "versionControl": false
    }
  }
}
```

When `versionControl` is `true` for a tool, its generated files are excluded from the managed `.gitignore` section.

## Recommended workflow

1. Commit `.ai/` to your repository
2. Run `lnai sync` after cloning or pulling changes
3. Add `lnai sync` to your setup script or CI pipeline so generated files stay up to date
