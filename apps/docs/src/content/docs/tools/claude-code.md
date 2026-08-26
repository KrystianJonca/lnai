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
├── settings.json      # Generated (permissions)
└── <overrides>        # Symlinks from .ai/.claude/
.mcp.json              # Generated (mcpServers) at project root
```

## File Mapping

| Source               | Output                   | Type      |
| -------------------- | ------------------------ | --------- |
| `.ai/AGENTS.md`      | `.claude/CLAUDE.md`      | Symlink   |
| `.ai/rules/`         | `.claude/rules/`         | Symlink   |
| `.ai/skills/<name>/` | `.claude/skills/<name>/` | Symlink   |
| `.ai/settings.json`  | `.claude/settings.json`  | Generated |
| `.ai/settings.json`  | `.mcp.json`              | Generated |
| `.ai/.claude/<path>` | `.claude/<path>`         | Symlink   |

## Generated settings.json

Permissions are written to `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Bash(git:*)"],
    "deny": ["Read(.env)"]
  }
}
```

To override the generated settings, place a custom `settings.json` in `.ai/.claude/`.

## Generated .mcp.json

MCP servers are written to `.mcp.json` at the project root (not inside `.claude/`), because Claude Code [does not read `mcpServers` from `settings.json`](https://github.com/anthropics/claude-code/issues/24477):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-memory"]
    }
  }
}
```

`oauth` (`clientId`, `clientSecret`, `callbackPort`, `scopes`) on a remote server is copied through as-is, since Claude Code's own MCP format is the source of truth for this field.
