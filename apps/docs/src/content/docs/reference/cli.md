---
title: CLI Reference
description: Complete reference for LNAI command-line interface
---

# CLI Reference

LNAI provides three commands for managing your unified AI configuration.

## Installation

```bash
pnpm add -g lnai
```

## lnai init

Initialize a new `.ai/` configuration directory.

```bash
lnai init [options]
```

| Option                   | Description                                 |
| ------------------------ | ------------------------------------------- |
| `--force`                | Overwrite existing .ai/ directory           |
| `--minimal`              | Create only config.json (no subdirectories) |
| `-t, --tools <tools...>` | Enable only specific tools                  |

### Examples

```bash
lnai init                        # Create full .ai/ structure
lnai init --minimal              # Create only config.json
lnai init --tools claudeCode     # Enable only Claude Code
lnai init --force                # Overwrite existing config
```

---

## lnai sync

Export the unified `.ai/` configuration to native tool formats.

```bash
lnai sync [options]
```

| Option                   | Description                           |
| ------------------------ | ------------------------------------- |
| `--dry-run`              | Preview changes without writing files |
| `-t, --tools <tools...>` | Filter to specific tools              |
| `-v, --verbose`          | Show detailed output                  |

### Output Symbols

| Symbol | Meaning        |
| ------ | -------------- |
| `+`    | File created   |
| `~`    | File updated   |
| `-`    | File deleted   |
| `=`    | File unchanged |

### Examples

```bash
lnai sync                        # Sync all enabled tools
lnai sync --dry-run              # Preview changes
lnai sync --tools claudeCode     # Sync only Claude Code
```

---

## lnai validate

Validate the unified `.ai/` configuration structure and content.

```bash
lnai validate [options]
```

| Option                   | Description                         |
| ------------------------ | ----------------------------------- |
| `-t, --tools <tools...>` | Filter validation to specific tools |

### Examples

```bash
lnai validate                    # Validate all configuration
lnai validate --tools claudeCode # Validate only for Claude Code
```

---

## Tool Identifiers

| Identifier   | Tool        |
| ------------ | ----------- |
| `claudeCode` | Claude Code |
| `opencode`   | OpenCode    |
