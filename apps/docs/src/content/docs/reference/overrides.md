---
title: Overrides
description: Reference for tool-specific overrides
---

# Overrides

Overrides let you customize tool-specific settings while maintaining a unified configuration.

## JSON Overrides

Define in `settings.json` under the `overrides` key:

```json
{
  "permissions": { ... },
  "mcpServers": { ... },
  "overrides": {
    "claudeCode": {
      "model": "opus"
    },
    "opencode": {
      "theme": "dark"
    },
    "cursor": {
      "customSetting": true
    },
    "copilot": {
      "mcpServers": { "extra": { "type": "stdio", "command": "node" } }
    }
  }
}
```

Values are deep-merged into the generated configuration.

### Merge Behavior

- **Objects**: Recursively merged
- **Arrays**: Concatenated and deduplicated
- **Primitives**: Override wins

### Common Overrides

**Claude Code:**

```json
{
  "overrides": {
    "claudeCode": {
      "model": "opus",
      "customInstructions": "Additional context..."
    }
  }
}
```

**OpenCode:**

```json
{
  "overrides": {
    "opencode": {
      "theme": "system",
      "keybindings": "vim"
    }
  }
}
```

**GitHub Copilot:**

```json
{
  "overrides": {
    "copilot": {
      "mcpServers": {
        "copilot-only": { "type": "stdio", "command": "node", "args": ["server.js"] }
      }
    }
  }
}
```

Note: Copilot MCP server overrides should be in Copilot's native format (with explicit `type: "stdio"` for stdio servers).

---

## File Overrides

Place files in tool-specific directories within `.ai/`:

```text
.ai/
├── .claude/       # Claude Code file overrides
├── .opencode/     # OpenCode file overrides
├── .cursor/       # Cursor file overrides
└── .copilot/      # GitHub Copilot file overrides
```

Files are symlinked to the tool's output directory:

| Source                 | Target             |
| ---------------------- | ------------------ |
| `.ai/.claude/<path>`   | `.claude/<path>`   |
| `.ai/.opencode/<path>` | `.opencode/<path>` |
| `.ai/.cursor/<path>`   | `.cursor/<path>`   |
| `.ai/.copilot/<path>`  | `.github/<path>`   |

### Example

```text
.ai/.claude/
└── commands/
    └── deploy.md
```

After `lnai sync`:

```text
.claude/
├── CLAUDE.md          # from unified config
├── settings.json      # generated
└── commands/
    └── deploy.md      # symlink
```

Use JSON overrides for settings, file overrides for additional files like custom commands.
