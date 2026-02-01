---
name: add-tool-plugin
description: Add support for a new AI coding tool
---

# Add Tool Plugin

Guide for adding LNAI support for a new AI coding tool.

## Overview

Each plugin implements the `Plugin` interface to transform unified `.ai/` config into a tool's native format.

## Before You Start

Search the official documentation for the target tool to understand its configuration format:

- What config files does it use?
- What file formats are supported (JSON, YAML, Markdown)?
- Where should config files be placed?
- What features does it support (rules, MCP, settings)?

## Steps

### 1. Add Tool ID

Update `packages/core/src/constants.ts`:

- Add tool ID to `TOOL_IDS` array (e.g., "newtool")
- Add output directory to `TOOL_OUTPUT_DIRS` map
- Add override directory to `OVERRIDE_DIRS` map

### 2. Create Plugin Directory

Create `packages/core/src/plugins/<tool-name>/`:

```
<tool-name>/
├── index.ts          # Plugin implementation
├── types.ts          # Tool-specific types (optional)
├── transforms.ts     # Transformation functions (optional)
└── index.test.ts     # Tests
```

### 3. Implement Plugin Interface

In `index.ts`, implement the `Plugin` interface:

```typescript
import type { Plugin } from "../types";
import type { OutputFile, UnifiedState, ValidationResult } from "../../types";
import { applyFileOverrides } from "../../utils/transforms";

export const newToolPlugin: Plugin = {
  id: "newtool",
  name: "New Tool",

  async detect(rootDir: string): Promise<boolean> {
    // Check if tool's config exists
    return false;
  },

  async import(rootDir: string): Promise<Partial<UnifiedState> | null> {
    // Import existing config to unified format
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];

    // Add AGENTS.md symlink
    if (state.agents) {
      files.push({
        path: ".newtool/AGENTS.md",
        type: "symlink",
        target: "../.ai/AGENTS.md",
      });
    }

    // Add rules, settings, MCP servers...

    return applyFileOverrides(files, rootDir, "newtool");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];
    const skipped: SkippedFeatureDetail[] = [];

    // Add warnings for unsupported features

    return { valid: true, errors: [], warnings, skipped };
  },
};
```

### 4. Register Plugin

In `packages/core/src/plugins/index.ts`:

```typescript
import { newToolPlugin } from "./newtool/index";
pluginRegistry.register(newToolPlugin);
```

### 5. Add Tests

Create `index.test.ts` with tests for `export()` and `validate()`.

### 6. Add Documentation

Create `apps/docs/src/content/docs/tools/<tool-name>.md` documenting:

- Tool overview
- Supported features
- Output format
- Any limitations

### 7. Run Quality Checks

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Key Concepts

- **OutputFile types**: "symlink", "json", "text"
- **applyFileOverrides()**: Apply user overrides from `.ai/.<tool>/`
- **ValidationResult**: Return warnings/skipped for unsupported features

## Reference Documentation

When implementing, refer to:

- Existing plugins in `packages/core/src/plugins/` as examples
- The Plugin interface in `packages/core/src/plugins/types.ts`
- Transform utilities in `packages/core/src/utils/transforms.ts`
