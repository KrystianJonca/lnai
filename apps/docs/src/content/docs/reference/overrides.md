---
title: Overrides
description: Reference for tool-specific file overrides
---

# Overrides

File overrides let you provide tool-specific files that take priority over generated content.

## File Overrides

Place files in tool-specific directories within `.ai/`:

```text
.ai/
├── .claude/       # Claude Code file overrides
├── .codex/        # Codex file overrides
├── .cursor/       # Cursor file overrides
├── .gemini/       # Gemini CLI file overrides
├── .opencode/     # OpenCode file overrides
├── .windsurf/     # Windsurf file overrides
└── .copilot/      # GitHub Copilot file overrides
```

Files are symlinked to the tool's output directory:

| Source                 | Target             |
| ---------------------- | ------------------ |
| `.ai/.claude/<path>`   | `.claude/<path>`   |
| `.ai/.opencode/<path>` | `.opencode/<path>` |
| `.ai/.cursor/<path>`   | `.cursor/<path>`   |
| `.ai/.codex/<path>`    | `.codex/<path>`    |
| `.ai/.gemini/<path>`   | `.gemini/<path>`   |
| `.ai/.windsurf/<path>` | `.windsurf/<path>` |
| `.ai/.copilot/<path>`  | `.github/<path>`   |

## Override Priority

When a file override exists at the same path as a generated file, the override takes priority. The generated file is replaced with a symlink to the override.

### Example

Given this structure:

```text
.ai/
├── settings.json          # Shared settings
└── .claude/
    └── settings.json      # Claude-specific override
```

After `lnai sync`:

```text
.claude/
├── CLAUDE.md          # symlink → ../.ai/AGENTS.md
└── settings.json      # symlink → ../.ai/.claude/settings.json (override wins)
```

The generated `settings.json` is replaced by a symlink to the override file.

## Common Use Cases

### Custom Settings

Override the generated settings file with custom configuration:

```text
.ai/.claude/settings.json
```

### Additional Commands

Add tool-specific commands that aren't part of the unified config:

```text
.ai/.claude/
└── commands/
    └── deploy.md
```

### Tool-Specific Workflows

Add GitHub Actions or other tool-specific files:

```text
.ai/.copilot/
└── workflows/
    └── ci.yml
```

After sync, this becomes `.github/workflows/ci.yml`.
