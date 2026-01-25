# LNAI

Unified AI configuration management CLI. Define your AI tool configurations once in `.ai/` and sync them to native formats for Claude Code, Opencode, and more.

## Installation

```bash
npm install -g @lnai/cli
```

## Quick Start

```bash
# Initialize a new .ai/ configuration
lnai init

# Validate your configuration
lnai validate

# Sync to native tool configs
lnai sync
```

## Commands

- `lnai init` - Create a new `.ai/` configuration directory
- `lnai validate` - Validate your `.ai/` configuration
- `lnai sync` - Export `.ai/` to native tool configs

## Configuration Structure

```
.ai/
├── config.json      # Tool settings and enabled tools
├── settings.json    # Permissions and MCP servers
├── AGENTS.md        # Project instructions
├── rules/           # Path-based rules
└── skills/          # Custom commands
```

## Documentation

See the [documentation](https://github.com/KrystianJonca/lnai) for detailed guides.

## License

MIT
