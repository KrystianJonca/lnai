---
title: Cursor
description: How LNAI exports configuration to Cursor IDE
---

# Cursor

LNAI exports unified configuration to Cursor IDE's native `.cursor/` format, transforming rules and settings as needed.

## Output Structure

```text
AGENTS.md                  # Symlink → .ai/AGENTS.md (at project root)
.cursor/
├── rules/<name>.mdc       # Transformed from .ai/rules/<name>.md
├── skills/<name>/         # Symlinks → ../../.ai/skills/<name>/
├── mcp.json               # Generated
├── cli.json               # Generated
└── <overrides>            # Symlinks from .ai/.cursor/
```

## File Mapping

| Source                | Output                     | Type        |
| --------------------- | -------------------------- | ----------- |
| `.ai/AGENTS.md`       | `AGENTS.md`                | Symlink     |
| `.ai/rules/<name>.md` | `.cursor/rules/<name>.mdc` | Transformed |
| `.ai/skills/<name>/`  | `.cursor/skills/<name>/`   | Symlink     |
| `.ai/settings.json`   | `.cursor/mcp.json`         | Generated   |
| `.ai/settings.json`   | `.cursor/cli.json`         | Generated   |
| `.ai/.cursor/<path>`  | `.cursor/<path>`           | Symlink     |

## Generated mcp.json

MCP servers are exported to `.cursor/mcp.json` with environment variable transformation:

```json
// Input (LNAI format)
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@example/db"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}

// Output (Cursor format)
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@example/db"],
      "env": { "DB_URL": "${env:DB_URL}" }
    }
  }
}
```

| LNAI           | Cursor           |
| -------------- | ---------------- |
| `${VAR}`       | `${env:VAR}`     |
| `type: "http"` | `url` field only |
| `type: "sse"`  | `url` field only |

## Generated cli.json

Permissions are exported to `.cursor/cli.json` with transformations:

```json
// Input (LNAI format)
{
  "permissions": {
    "allow": ["Bash(git:*)"],
    "ask": ["Bash(npm:*)"],
    "deny": ["Read(.env)"]
  }
}

// Output (Cursor format)
{
  "permissions": {
    "allow": ["Shell(git)", "Shell(npm)"],
    "deny": ["Read(.env)"]
  }
}
```

| LNAI             | Cursor          | Notes                             |
| ---------------- | --------------- | --------------------------------- |
| `Bash()`         | `Shell()`       | Tool name changed                 |
| `git:*`          | `git`           | Pattern simplified to command     |
| `permissions.ask`| `permissions.allow` | ⚠️ Cursor has no "ask" level |

**Warning:** Cursor does not support the "ask" permission level. Rules in `permissions.ask` are automatically mapped to `permissions.allow`. LNAI will display a warning when this occurs.

## Rules Transformation

Rules are transformed from `.md` to `.mdc` format with YAML frontmatter:

```markdown
<!-- Input: .ai/rules/typescript.md -->
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Guidelines

Use strict TypeScript...
```

```markdown
<!-- Output: .cursor/rules/typescript.mdc -->
---
description: "TypeScript Guidelines"
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# TypeScript Guidelines

Use strict TypeScript...
```

| LNAI Field    | Cursor Field  | Notes                                    |
| ------------- | ------------- | ---------------------------------------- |
| `paths`       | `globs`       | Renamed                                  |
| (first H1)    | `description` | Extracted from content                   |
| (empty paths) | `alwaysApply: true` | Rules without paths always apply   |

## Overrides

Place Cursor-specific files in `.ai/.cursor/` to have them symlinked directly:

```text
.ai/.cursor/
└── custom-config.json → .cursor/custom-config.json
```

You can also use `overrides.cursor` in `.ai/settings.json` to deep-merge additional settings into the generated files:

```json
{
  "overrides": {
    "cursor": {
      "mcpServers": {
        "custom-server": { "command": "custom", "args": [] }
      }
    }
  }
}
```
