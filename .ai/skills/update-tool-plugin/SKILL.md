---
name: update-tool-plugin
description: Update an existing LNAI tool plugin
---

# Update Tool Plugin

Guide for modifying an existing plugin to support new features or fix issues.

## Before You Start

Search the official documentation for the target tool to understand:

- Has the configuration format changed?
- Are there new features to support?
- What is the expected output format?

## Plugin Locations

All plugins are in `packages/core/src/plugins/`:

- `claude-code/` - Claude Code
- `cursor/` - Cursor IDE
- `copilot/` - GitHub Copilot
- `windsurf/` - Windsurf IDE
- `opencode/` - OpenCode
- `gemini/` - Gemini CLI
- `codex/` - Codex

## Common Update Scenarios

### Adding Support for a New Feature

1. **Search official docs** for the feature's config format
2. **Update `export()` method** to generate new output files
3. **Remove from `skipped`** in `validate()` if feature was previously skipped
4. **Add tests** for the new export behavior

### Fixing Transformation Issues

1. **Check `transforms.ts`** for transformation logic
2. **Update transformation functions** as needed
3. **Verify with tests** that output matches expected format

### Updating Output Format

1. **Review tool's official docs** for current format requirements
2. **Update `export()` to match** new format requirements
3. **Update tests** to verify new output structure

## Testing Changes

```bash
# Run plugin-specific tests
pnpm test packages/core/src/plugins/<tool-name>/

# Run all tests
pnpm test

# Test against real project
lnai sync --dry-run -t <tool-name>
```

## Key Files to Review

| File                        | Purpose                         |
| --------------------------- | ------------------------------- |
| `index.ts`                  | Main plugin implementation      |
| `types.ts`                  | Tool-specific type definitions  |
| `transforms.ts`             | Format transformation functions |
| `../types.ts`               | Plugin interface definition     |
| `../../utils/transforms.ts` | Shared transform utilities      |

## Validation Patterns

```typescript
// Mark feature as skipped (not supported)
skipped.push({
  feature: "permissions",
  reason: "Tool uses global permissions only",
});

// Add warning (supported but with caveats)
warnings.push({
  message: "MCP servers require manual setup",
  path: ["settings", "mcpServers"],
});
```

## After Making Changes

1. Run `pnpm typecheck` to verify types
2. Run `pnpm test` to verify tests pass
3. Run `lnai sync --dry-run` to preview output
4. Update documentation if behavior changed

## Reference Documentation

- Existing plugins in `packages/core/src/plugins/` as examples
- The Plugin interface in `packages/core/src/plugins/types.ts`
- Transform utilities in `packages/core/src/utils/transforms.ts`
