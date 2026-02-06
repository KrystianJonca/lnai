# LNAI Project Agent Instructions

You are working on the LNAI project - a unified AI configuration management tool that allows you to define configurations once in `.ai/` and export them to native formats for multiple AI coding tools.

## Key Principles

1. **Keep configuration DRY** - Define once in `.ai/`, export to native formats
2. **Use symlinks where possible** - Avoid duplication by symlinking shared files
3. **Transform configurations appropriately** - Each tool gets its native format

## Supported Tools

| Tool           | Output Directory | Rules | Skills | MCP | Settings |
| -------------- | ---------------- | ----- | ------ | --- | -------- |
| Claude Code    | `.claude/`       | Yes   | Yes    | Yes | Yes      |
| OpenCode       | `.opencode/`     | Yes   | Yes    | Yes | Yes      |
| Cursor         | `.cursor/`       | Yes   | Yes    | Yes | Yes      |
| GitHub Copilot | `.github/`       | Yes   | Yes    | Yes | Yes      |
| Windsurf       | `.windsurf/`     | Yes   | Yes    | No  | No       |
| Gemini CLI     | `.gemini/`       | Yes   | Yes    | Yes | Yes      |
| Codex          | `.codex/`        | Yes   | Yes    | Yes | No       |

## Project Structure

```
lnai/
├── packages/
│   └── core/               # Core library
│       └── src/
│           ├── plugins/    # Tool plugins (claude-code, cursor, etc.)
│           ├── types/      # TypeScript types and Zod schemas
│           ├── utils/      # Utility functions
│           ├── constants.ts
│           └── errors.ts
├── apps/
│   ├── cli/                # CLI application (lnai command)
│   └── docs/               # Documentation site
└── .ai/                    # LNAI's own unified config
```

## Core Concepts

### UnifiedState

The central data structure representing all configuration:

- `agents` - AGENTS.md content
- `rules` - Array of rule files with paths and content
- `skills` - Array of skill definitions
- `settings` - Settings including MCP servers, permissions
- `config` - Tool enable/disable configuration

### OutputFile

What plugins generate:

- `path` - Output file path relative to project root
- `type` - "symlink" | "json" | "text"
- `content` or `target` - File content or symlink target

### Plugin Interface

```typescript
interface Plugin {
  id: ToolId;
  name: string;
  detect(rootDir: string): Promise<boolean>;
  import(rootDir: string): Promise<Partial<UnifiedState> | null>;
  export(state: UnifiedState, rootDir: string): Promise<OutputFile[]>;
  validate(state: UnifiedState): ValidationResult;
}
```

## Development Commands

```bash
pnpm build      # Build all packages
pnpm test       # Run tests
pnpm lint       # Lint code
pnpm typecheck  # Type check
pnpm format     # Format code
```

## CLI Commands

```bash
lnai sync                    # Sync .ai/ to all enabled tools
lnai sync -t cursor          # Sync to specific tool only
lnai sync --dry-run          # Preview without writing files
lnai validate                # Validate .ai/ configuration
lnai init                    # Initialize .ai/ directory
```

## Error Handling

The project uses a hierarchy of custom errors:

| Error Class         | Code             | Purpose                      |
| ------------------- | ---------------- | ---------------------------- |
| `LnaiError`         | -                | Base error class             |
| `ParseError`        | PARSE_ERROR      | Failed to parse config files |
| `ValidationError`   | VALIDATION_ERROR | Schema validation failures   |
| `FileNotFoundError` | FILE_NOT_FOUND   | Required file missing        |
| `WriteError`        | WRITE_ERROR      | Failed to write output file  |
| `PluginError`       | PLUGIN_ERROR     | Plugin-specific errors       |

## TypeScript Patterns

### Zod-First Types

Define schemas with Zod, infer TypeScript types:

```typescript
const MySchema = z.object({ ... });
type MyType = z.infer<typeof MySchema>;
```

### Naming Conventions

- PascalCase for types and interfaces
- camelCase for variables and functions
- UPPER_SNAKE_CASE for constants

### Import Ordering

1. Node built-ins (`node:fs`, `node:path`)
2. External packages (`zod`, `commander`)
3. Workspace packages (`@lnai/core`)
4. Relative imports (`./utils`, `../types`)

## Testing

- Uses Vitest for testing
- Tests are colocated with source files (`*.test.ts`)
- Run with `pnpm test`

## Key Utilities

| Function                  | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `applyFileOverrides()`    | Apply user overrides from `.ai/.<tool>/`              |
| `groupRulesByDirectory()` | Group rules by their directory for tools that need it |
| `parseUnifiedConfig()`    | Parse and validate `.ai/` directory                   |
