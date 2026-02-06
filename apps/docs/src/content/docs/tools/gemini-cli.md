---
title: Gemini CLI / Antigravity
description: How LNAI exports configuration to Gemini CLI and Antigravity
---

# Gemini CLI / Antigravity

[Gemini CLI](https://github.com/google-gemini/gemini-cli) is Google's AI-powered command-line tool. Antigravity is Google's VS Code fork with Gemini integration. Both tools share the same `.gemini/` configuration format.

LNAI exports unified configuration to the native `.gemini/` format, transforming settings and rules as needed.

## Output Structure

```text
AGENTS.md              # Symlink → .ai/AGENTS.md (at project root)

.gemini/
├── settings.json      # Generated (MCP servers + context.fileName)
├── skills/<name>/     # Symlinks → ../../.ai/skills/<name>/
└── <overrides>        # Symlinks from .ai/.gemini/

<dir>/GEMINI.md        # Generated (rules per directory)
```

## File Mapping

| Source               | Output                   | Type                              |
| -------------------- | ------------------------ | --------------------------------- |
| `.ai/AGENTS.md`      | `AGENTS.md` at root      | Symlink                           |
| `.ai/AGENTS.md`      | `.gemini/settings.json`  | `context.fileName: ["AGENTS.md"]` |
| `.ai/rules/*.md`     | `<dir>/GEMINI.md`        | Generated                         |
| `.ai/skills/<name>/` | `.gemini/skills/<name>/` | Symlink                           |
| `.ai/settings.json`  | `.gemini/settings.json`  | Transformed                       |
| `.ai/.gemini/<path>` | `.gemini/<path>`         | Symlink                           |

## Transformations

### Context

When `AGENTS.md` exists, LNAI configures Gemini CLI to read it via `context.fileName` in `settings.json`:

```json
{
  "context": {
    "fileName": ["AGENTS.md"]
  }
}
```

This tells Gemini CLI to automatically include the root `AGENTS.md` file as context.

### MCP Servers

HTTP/SSE servers use `httpUrl` instead of `url`:

```json
// Input (LNAI format)
{
  "mcpServers": {
    "remote": {
      "url": "https://example.com/mcp"
    }
  }
}

// Output (Gemini format)
{
  "mcpServers": {
    "remote": {
      "httpUrl": "https://example.com/mcp"
    }
  }
}
```

| LNAI  | Gemini CLI |
| ----- | ---------- |
| `url` | `httpUrl`  |

### Rules

Rules are grouped by their target directory and combined into `GEMINI.md` files:

```markdown
## <!-- Input: .ai/rules/typescript.md -->

paths:

- "src/\*_/_.ts"

---

Use strict TypeScript...
```

```text
<!-- Output: src/GEMINI.md -->
## typescript.md

Use strict TypeScript...
```

Rules targeting the project root (`.`) are placed at the root level. Rules targeting subdirectories (e.g., `apps/cli/**`) create `GEMINI.md` files in those directories.

## Unsupported Features

### Permissions

Gemini CLI does not support pre-configured permissions in `settings.json`. Permissions must be granted interactively when prompted during execution.

If your `.ai/settings.json` contains a `permissions` block, LNAI will display a warning but continue syncing other configuration.

## Overrides

Place Gemini-specific files in `.ai/.gemini/` to have them symlinked directly:

```text
.ai/.gemini/
└── custom-config.json → .gemini/custom-config.json
```

When an override file exists at the same path as a generated file (e.g., `settings.json`), the override takes priority.
