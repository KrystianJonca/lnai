---
paths:
  - "packages/**/*.ts"
  - "apps/**/*.ts"
---

# Testing and Quality Checks

After completing a major feature or significant code changes, run the full quality check suite.

## Required Checks

Run these commands in order after each major feature implementation:

1. **Lint** - Check for code style issues

   ```bash
   pnpm lint
   ```

2. **Format** - Verify code formatting

   ```bash
   pnpm format --check
   ```

3. **Type Check** - Verify TypeScript types

   ```bash
   pnpm typecheck
   ```

4. **Test** - Run the test suite
   ```bash
   pnpm test
   ```

## Quick Combined Check

Run all checks at once:

```bash
pnpm lint && pnpm format --check && pnpm typecheck && pnpm test
```

## When to Run

- After implementing a new feature
- After refactoring existing code
- Before creating a pull request
- After resolving merge conflicts
