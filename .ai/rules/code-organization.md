---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Top-Down Code Organization

Organize code using top-down approach: public API first, implementation details last.

## File Structure Order

1. **Imports** - External deps first, then internal
2. **Type exports** - Public types/interfaces
3. **Constants** - Exported constants
4. **Main exports** - Primary functions/classes (public API)
5. **Helper functions** - Private implementation details

## Rationale

- Readers understand public API without scrolling
- "Newspaper metaphor" - headline first, details later
