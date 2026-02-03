---
paths:
  - "packages/**/*.ts"
  - "apps/**/*.ts"
---

# TypeScript Coding Standards

## General Guidelines

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types from schemas using Zod inference

## Zod Patterns

Define schemas first, infer types from them:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;
```

## Naming Conventions

- Use PascalCase for types and interfaces
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants

## Import Ordering

1. Node built-ins (`node:fs`, `node:path`)
2. External packages (`zod`, `commander`)
3. Workspace packages (`@lnai/core`)
4. Relative imports (`./utils`, `../types`)

## Error Handling

- Create custom error classes extending base `LnaiError`
- Include error codes for programmatic handling
- Preserve error causes for debugging

### Error Subclasses

| Class               | Code             | Use Case                     |
| ------------------- | ---------------- | ---------------------------- |
| `ParseError`        | PARSE_ERROR      | Failed to parse config files |
| `ValidationError`   | VALIDATION_ERROR | Schema validation failures   |
| `FileNotFoundError` | FILE_NOT_FOUND   | Required file missing        |
| `WriteError`        | WRITE_ERROR      | Failed to write output file  |
| `PluginError`       | PLUGIN_ERROR     | Plugin-specific errors       |

Example:

```typescript
throw new ParseError(`Failed to parse ${filePath}`, filePath, originalError);
```
