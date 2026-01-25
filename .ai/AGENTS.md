# LNAI Project Agent Instructions

You are working on the LNAI project - a unified AI configuration management tool.

## Key Principles

1. Keep configuration DRY - define once in .ai/, export to native formats
2. Use symlinks where possible to avoid duplication
3. Transform configurations appropriately for each target tool

## Project Structure

- `packages/core` - Core library with parser, validator, plugins, and pipeline
- `apps/cli` - CLI application for sync and validate commands
- `apps/docs` - Documentation site

## Development Commands

- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Lint code
