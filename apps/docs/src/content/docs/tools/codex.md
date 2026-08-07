---
title: Codex
description: How LNAI exports configuration to Codex
---

# Codex

LNAI exports unified configuration to Codex Team Config under the `.codex/` directory.

## Output Structure

```text
AGENTS.md              # Symlink -> .ai/AGENTS.md (at project root)

.agents/
└── skills/<name>/     # Symlinks -> ../../.ai/skills/<name>/

.codex/
├── config.toml        # Generated (MCP servers)
└── <overrides>        # Symlinks from .ai/.codex/

<dir>/AGENTS.md        # Generated (rules per directory)
```

## File Mapping

| Source               | Output                   | Type      |
| -------------------- | ------------------------ | --------- |
| `.ai/AGENTS.md`      | `AGENTS.md`              | Symlink   |
| `.ai/rules/*.md`     | `<dir>/AGENTS.md`        | Generated |
| `.ai/skills/<name>/` | `.agents/skills/<name>/` | Symlink   |
| `.ai/settings.json`  | `.codex/config.toml`     | Generated |
| `.ai/.codex/<path>`  | `.codex/<path>`          | Symlink   |

## Generated config.toml

MCP servers are exported into Codex's `mcp_servers` blocks:

```json
// Input (LNAI format)
{
  "mcpServers": {
    "db": {
      "command": "npx",
      "args": ["-y", "@example/db"],
      "env": { "DB_URL": "${DB_URL}" }
    },
    "remote": {
      "url": "https://mcp.example.com",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

```toml
# Output (Codex format)
[mcp_servers.db]
command = "npx"
args = ["-y", "@example/db"]
env = { DB_URL = "${DB_URL}" }

[mcp_servers.remote]
url = "https://mcp.example.com"
http_headers = { Authorization = "Bearer ${API_KEY}" }
```

`clientId` is synced into a nested `[mcp_servers.<name>.oauth]` table, and `scopes` as a sibling key at the server level (not nested inside `oauth` - Codex's per-server oauth table only has room for `client_id`):

```json
// Input (LNAI format)
{
  "mcpServers": {
    "my-remote-server": {
      "url": "https://mcp.example.com",
      "oauth": {
        "clientId": "client-123",
        "callbackPort": 8080,
        "scopes": ["read", "write"]
      }
    }
  }
}
```

```toml
# Output (Codex format)
mcp_oauth_callback_port = 8080

[mcp_servers.my-remote-server]
url = "https://mcp.example.com"
scopes = ["read", "write"]

[mcp_servers.my-remote-server.oauth]
client_id = "client-123"
```

| LNAI           | Codex                                              |
| -------------- | -------------------------------------------------- |
| `clientId`     | `client_id` under `[mcp_servers.<name>.oauth]`     |
| `scopes`       | `scopes` on `[mcp_servers.<name>]` itself          |
| `callbackPort` | `mcp_oauth_callback_port` (global, root-level key) |
| `clientSecret` | ⚠️ Not supported by Codex - skipped with a warning |

`callbackPort` has no per-server equivalent in Codex - it's a single global setting shared by every MCP server's OAuth flow. If multiple servers configure different `callbackPort` values, LNAI uses the first one and warns about the rest, since Codex can't apply more than one.

## Rules

Rules are grouped by directory using their `paths` globs and written to
`<dir>/AGENTS.md` files. Only subdirectory rules are exported; rules targeting
project root (`.`) are skipped and reported as warnings.

## Unsupported Features

### Permissions

Codex permissions rules are not generated from LNAI permissions. If your
`.ai/settings.json` contains a `permissions` block, LNAI will display a "skipped"
notice but continue syncing other configuration.

## Overrides

Place Codex-specific files in `.ai/.codex/` to have them symlinked directly:

```text
.ai/.codex/
└── custom-config.toml -> .codex/custom-config.toml
```

When an override file exists at the same path as a generated file (e.g.,
`config.toml`), the override takes priority.
