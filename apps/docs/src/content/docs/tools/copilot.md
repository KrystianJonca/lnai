---
title: GitHub Copilot
description: How LNAI exports configuration to GitHub Copilot
---

# GitHub Copilot

LNAI exports unified configuration to GitHub Copilot's native formats, including repository instructions, path-specific rules, and MCP servers.

## Output Structure

```text
.github/
├── copilot-instructions.md              # Symlink → ../.ai/AGENTS.md
├── instructions/<name>.instructions.md  # Transformed from .ai/rules/<name>.md
├── skills/<name>/                       # Symlinks → ../../.ai/skills/<name>/
└── <overrides>                          # Symlinks from .ai/.copilot/
.vscode/
└── mcp.json                             # Generated MCP servers
```

## File Mapping

| Source                | Output                                        | Type        |
| --------------------- | --------------------------------------------- | ----------- |
| `.ai/AGENTS.md`       | `.github/copilot-instructions.md`             | Symlink     |
| `.ai/rules/<name>.md` | `.github/instructions/<name>.instructions.md` | Transformed |
| `.ai/skills/<name>/`  | `.github/skills/<name>/`                      | Symlink     |
| `.ai/settings.json`   | `.vscode/mcp.json`                            | Generated   |
| `.ai/.copilot/<path>` | `.github/<path>`                              | Symlink     |

## Generated mcp.json

MCP servers are exported to `.vscode/mcp.json` with transformations:

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

// Output (Copilot format in .vscode/mcp.json)
{
  "inputs": [],
  "servers": {
    "database": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@example/db"],
      "env": { "DB_URL": "${env:DB_URL}" }
    }
  }
}
```

### Stdio Servers

| LNAI           | Copilot                  |
| -------------- | ------------------------ |
| `${VAR}`       | `${env:VAR}`             |
| Stdio implicit | `type: "stdio"` explicit |

### HTTP/SSE Servers

```json
// Input (LNAI format)
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" }
    }
  }
}

// Output (Copilot format)
{
  "inputs": [],
  "servers": {
    "api": {
      "url": "https://api.example.com/mcp",
      "requestInit": {
        "headers": { "Authorization": "Bearer ${env:TOKEN}" }
      }
    }
  }
}
```

| LNAI           | Copilot                        |
| -------------- | ------------------------------ |
| `type: "http"` | `url` field only (no type)     |
| `type: "sse"`  | `url` field only (no type)     |
| `headers: {}`  | `requestInit: { headers: {} }` |

## Rules Transformation

Rules are transformed from `.md` to `.instructions.md` format with YAML frontmatter:

```markdown
## <!-- Input: .ai/rules/typescript.md -->

paths:

- "\*_/_.ts"
- "\*_/_.tsx"

---

# TypeScript Guidelines

Use strict TypeScript...
```

```markdown
## <!-- Output: .github/instructions/typescript.instructions.md -->

applyTo: "**/\*.ts,**/\*.tsx"
description: "TypeScript Guidelines"

---

# TypeScript Guidelines

Use strict TypeScript...
```

| LNAI Field    | Copilot Field | Notes                  |
| ------------- | ------------- | ---------------------- |
| `paths`       | `applyTo`     | Joined with comma      |
| (first H1)    | `description` | Extracted from content |
| (empty paths) | (no applyTo)  | Rule applies globally  |

## Unsupported Features

| Feature           | Status     | Notes                                            |
| ----------------- | ---------- | ------------------------------------------------ |
| Permissions       | ⚠️ Ignored | Copilot does not support permissions             |
| Non-MCP overrides | ⚠️ Ignored | Only `mcpServers` is supported in JSON overrides |

LNAI will display warnings when unsupported features are configured.

## Overrides

Place Copilot-specific files in `.ai/.copilot/` to have them symlinked to `.github/`:

```text
.ai/.copilot/
└── workflows/
    └── custom.yml → .github/workflows/custom.yml
```

When an override file exists at the same path as a generated file, the override takes priority.
