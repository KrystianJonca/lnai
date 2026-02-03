<p align="center">
  <img alt="LNAI Logo" src="https://raw.githubusercontent.com/KrystianJonca/lnai/main/apps/docs/public/lnai_white_on_black.png" width="200">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lnai">
    <img alt="npm version" src="https://img.shields.io/npm/v/lnai">
  </a>
  <a href="https://www.npmjs.com/package/lnai">
    <img alt="npm downloads" src="https://img.shields.io/npm/dm/lnai">
  </a>
  <a href="https://github.com/KrystianJonca/lnai/actions/workflows/ci.yml">
    <img alt="build status" src="https://img.shields.io/github/actions/workflow/status/KrystianJonca/lnai/ci.yml?branch=main">
  </a>
  <a href="https://github.com/KrystianJonca/lnai/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/github/license/KrystianJonca/lnai">
  </a>
  <a href="https://github.com/KrystianJonca/lnai/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/KrystianJonca/lnai?style=social">
  </a>
</p>

# LNAI

Stop maintaining separate config files for every AI coding tool. Define once in `.ai/`, sync everywhere.

## Why LNAI?

- **One source of truth** — Write your project rules, MCP servers, and permissions once
- **Works with your tools** — Syncs to native formats each tool actually reads
- **Stay in sync** — Update `.ai/` and run `lnai sync` to propagate changes instantly
- **Automatic cleanup** — Orphaned files are removed when configs change

## Supported Tools

| Tool           | Config Generated                  |
| -------------- | --------------------------------- |
| Claude Code    | `.claude/`                        |
| Codex          | `.codex/`                         |
| Cursor         | `.cursor/`                        |
| Gemini CLI     | `.gemini/`                        |
| GitHub Copilot | `.github/copilot-instructions.md` |
| OpenCode       | `.opencode/`                      |
| Windsurf       | `.windsurf/`                      |

## Quick Start

```bash
npm install -g lnai

lnai init      # Create .ai/ configuration
lnai validate  # Check for errors
lnai sync      # Export to native tool configs
```

## Documentation

Full guides and configuration reference at [lnai.sh](https://lnai.sh)

## License

MIT

---

If you find LNAI helpful, please [star us on GitHub](https://github.com/KrystianJonca/lnai)!
