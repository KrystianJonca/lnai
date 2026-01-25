---
paths:
  - "src/**/*.ts"
  - "packages/**/*.ts"
---

# TypeScript Coding Standards

## General Guidelines

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types from schemas using Zod inference

## Naming Conventions

- Use PascalCase for types and interfaces
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants

## Error Handling

- Create custom error classes extending base LnaiError
- Include error codes for programmatic handling
- Preserve error causes for debugging
