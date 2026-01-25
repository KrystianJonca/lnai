---
title: Quick Start
description: Get up and running with LNAI in minutes
---

# Quick Start

## 1. Initialize configuration

```bash
lnai init
```

This creates the `.ai/` directory with default config files.

## 2. Customize AGENTS.md

Edit `.ai/AGENTS.md` with your project guidelines:

```markdown
# Project Guidelines

This is a TypeScript project using Node.js 22.

## Code Style

- Use ESM imports
- Prefer const over let
- Use async/await over callbacks
```

## 3. Configure settings (optional)

Edit `.ai/settings.json` to add permissions or MCP servers:

```json
{
  "permissions": {
    "allow": ["Bash(git:*)"],
    "ask": ["Bash(npm:*)"]
  }
}
```

## 4. Sync to native configs

```bash
lnai sync
```

## 5. Validate configuration

```bash
lnai validate
```
