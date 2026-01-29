<p align="center">
  <img alt="LNAI Logo" src="https://raw.githubusercontent.com/KrystianJonca/lnai/main/apps/docs/public/lnai_white_on_black.png" width="200">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lnai">
    <img alt="npm version" src="https://img.shields.io/npm/v/lnai">
  </a>
  <a href="https://github.com/KrystianJonca/lnai/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/KrystianJonca/lnai?style=social">
  </a>
</p>

# LNAI

Unified AI configuration management CLI. Define your AI tool configurations once in `.ai/` and sync them to native formats for Claude Code, Cursor, OpenCode, GitHub Copilot, and more.

## Documentation

See the [documentation](https://lnai.sh) for detailed guides.

## Installation

```bash
npm install -g lnai
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

## License

MIT

---

If you find LNAI helpful, please [star us on GitHub](https://github.com/KrystianJonca/lnai)!
