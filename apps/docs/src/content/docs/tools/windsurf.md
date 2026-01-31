---
title: Windsurf
description: How LNAI exports configuration to Windsurf IDE
---

# Windsurf

LNAI exports unified configuration to Windsurf IDE's native `.windsurf/` format, transforming rules as needed.

## Output Structure

```text
AGENTS.md                    # Symlink → .ai/AGENTS.md (at project root)
.windsurf/
├── rules/<name>.md          # Transformed from .ai/rules/<name>.md
├── skills/<name>/           # Symlinks → ../../.ai/skills/<name>/
└── <overrides>              # Symlinks from .ai/.windsurf/
```

## File Mapping

| Source                | Output                       | Type        |
| --------------------- | ---------------------------- | ----------- |
| `.ai/AGENTS.md`       | `AGENTS.md`                  | Symlink     |
| `.ai/rules/<name>.md` | `.windsurf/rules/<name>.md`  | Transformed |
| `.ai/skills/<name>/`  | `.windsurf/skills/<name>/`   | Symlink     |
| `.ai/.windsurf/<path>`| `.windsurf/<path>`           | Symlink     |

## Rules Transformation

Rules are transformed to Windsurf format with `trigger: manual` frontmatter:

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
<!-- Output: .windsurf/rules/typescript.md -->
---
trigger: manual
---

# TypeScript Guidelines

Use strict TypeScript...
```

| LNAI Field | Windsurf Field | Notes                                    |
| ---------- | -------------- | ---------------------------------------- |
| `paths`    | (not mapped)   | Windsurf uses trigger modes instead      |
| —          | `trigger`      | Always set to `manual`                   |

**Note:** Rules are exported with `trigger: manual` and require explicit `@mention` to invoke in Windsurf. This ensures predictable behavior across tools.

### Windsurf Trigger Modes

Windsurf supports these trigger modes (only `manual` is used by LNAI):

| Trigger          | Description                              |
| ---------------- | ---------------------------------------- |
| `manual`         | Requires explicit @mention to invoke     |
| `always_on`      | Always active in conversations           |
| `model_decision` | AI decides when to apply                 |
| `glob`           | Triggered by file patterns               |

## Unsupported Features

### MCP Servers

Windsurf uses a global MCP configuration at `~/.codeium/windsurf/mcp_config.json`. Project-level MCP servers defined in `.ai/settings.json` are **not exported** to Windsurf.

LNAI will display a "skipped" notice when MCP servers are present:

```text
windsurf:
  ⊘ mcpServers: Windsurf uses global MCP config at ~/.codeium/windsurf/mcp_config.json
```

### Permissions

Windsurf does not support declarative permissions. Any permissions defined in `.ai/settings.json` are **not exported** to Windsurf.

## Overrides

Place Windsurf-specific files in `.ai/.windsurf/` to have them symlinked directly:

```text
.ai/.windsurf/
└── workflows/deploy.md → .windsurf/workflows/deploy.md
```

When an override file exists at the same path as a generated file, the override takes priority.
