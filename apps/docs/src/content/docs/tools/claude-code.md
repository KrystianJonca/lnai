---
title: Claude Code
description: How LNAI exports configuration to Claude Code
---

# Claude Code

LNAI exports unified configuration to Claude Code's native `.claude/` format.

## Output Structure

```text
.claude/
├── CLAUDE.md          # Symlink → ../.ai/AGENTS.md
├── rules/             # Symlink → ../.ai/rules/
├── skills/<name>/     # Symlinks → ../../.ai/skills/<name>/
├── settings.json      # Generated
└── <overrides>        # Symlinks from .ai/.claude/
```

## File Mapping

| Source               | Output                   | Type      |
| -------------------- | ------------------------ | --------- |
| `.ai/AGENTS.md`      | `.claude/CLAUDE.md`      | Symlink   |
| `.ai/rules/`         | `.claude/rules/`         | Symlink   |
| `.ai/skills/<name>/` | `.claude/skills/<name>/` | Symlink   |
| `.ai/settings.json`  | `.claude/settings.json`  | Generated |
| `.ai/.claude/<path>` | `.claude/<path>`         | Symlink   |

## Generated settings.json

Settings are passed through directly in Claude format:

```json
{
  "permissions": {
    "allow": ["Bash(git:*)"],
    "deny": ["Read(.env)"]
  },
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-memory"]
    }
  }
}
```

Any settings in `overrides.claudeCode` are deep-merged into the output.
