---
title: OpenCode
description: How LNAI exports configuration to OpenCode
---

# OpenCode

LNAI exports unified configuration to OpenCode's native format, transforming settings as needed.

## Output Structure

```text
AGENTS.md              # Symlink → .ai/AGENTS.md (at project root)

.agents/
└── skills/<name>/     # Symlinks → ../../.ai/skills/<name>/

.opencode/
├── rules/             # Symlink → ../.ai/rules/
└── <overrides>        # Symlinks from .ai/.opencode/

opencode.json          # Generated (at project root)
```

## File Mapping

| Source                 | Output                     | Type        |
| ---------------------- | -------------------------- | ----------- |
| `.ai/AGENTS.md`        | `AGENTS.md` (project root) | Symlink     |
| `.ai/rules/`           | `.opencode/rules/`         | Symlink     |
| `.ai/skills/<name>/`   | `.agents/skills/<name>/`   | Symlink     |
| `.ai/settings.json`    | `opencode.json`            | Transformed |
| `.ai/.opencode/<path>` | `.opencode/<path>`         | Symlink     |

## Transformations

### Permissions

```json
// Input (Claude format)
{ "permissions": { "allow": ["Bash(git:*)"] } }

// Output (OpenCode format)
{ "permission": { "bash": { "git *": "allow" } } }
```

### MCP Servers

```json
// Input (Claude stdio)
{ "command": "npx", "args": ["-y", "@example/mcp"] }

// Output (OpenCode local)
{ "type": "local", "command": ["npx", "-y", "@example/mcp"] }
```

| Claude                    | OpenCode                          |
| ------------------------- | --------------------------------- |
| stdio (`command`, `args`) | `type: "local"`, `command: [...]` |
| `type: "http"` or `"sse"` | `type: "remote"`                  |
| `env: {}`                 | `environment: {}`                 |
| `${VAR}`                  | `{env:VAR}`                       |

Place OpenCode-specific files in `.ai/.opencode/` to have them symlinked to `.opencode/`.
