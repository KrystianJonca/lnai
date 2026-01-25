---
title: Configuration
description: Reference for LNAI configuration files
---

# Configuration

LNAI uses two JSON files for configuration: `config.json` for tool settings and `settings.json` for shared configuration.

## config.json

Controls which tools are enabled and their sync behavior.

```
.ai/config.json
```

### Schema

```json
{
  "tools": {
    "claudeCode": {
      "enabled": true,
      "versionControl": false
    },
    "opencode": {
      "enabled": true,
      "versionControl": false
    }
  }
}
```

| Field            | Type      | Description                                |
| ---------------- | --------- | ------------------------------------------ |
| `enabled`        | `boolean` | Whether to sync configuration to this tool |
| `versionControl` | `boolean` | Track generated files in git (default: false) |

If `config.json` is missing, all tools are synced by default.

---

## settings.json

Contains shared configuration that applies to all tools.

```
.ai/settings.json
```

### Schema

```json
{
  "permissions": {
    "allow": ["Bash(git:*)"],
    "ask": ["Bash(npm:*)"],
    "deny": ["Read(.env)"]
  },
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-memory"]
    }
  },
  "overrides": {
    "claudeCode": { "model": "opus" },
    "opencode": { "theme": "dark" }
  }
}
```

---

## Permissions

Control what operations AI tools can perform.

| Level   | Behavior                     |
| ------- | ---------------------------- |
| `allow` | Operation runs automatically |
| `ask`   | User must confirm            |
| `deny`  | Operation is blocked         |

### Format

Permissions use the format: `Tool(pattern)`

| Tool    | Operations     |
| ------- | -------------- |
| `Bash`  | Shell commands |
| `Read`  | File reading   |
| `Write` | File writing   |
| `Edit`  | File editing   |

### Example

```json
{
  "permissions": {
    "allow": ["Bash(git status)", "Bash(pnpm test)"],
    "ask": ["Bash(git:*)", "Bash(npm:*)"],
    "deny": ["Read(.env)", "Read(*.pem)"]
  }
}
```

---

## MCP Servers

Configure Model Context Protocol servers.

### Stdio (Local)

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

### HTTP/SSE (Remote)

```json
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "https://mcp.example.com",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

Use `${VAR}` syntax for environment variables.
