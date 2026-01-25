---
name: deploy
description: Deploy the LNAI package to npm
---

# Deploy Skill

Deploy the LNAI packages to npm.

## Steps

1. Run tests: `pnpm test`
2. Build packages: `pnpm build`
3. Bump version: `pnpm changeset version`
4. Publish: `pnpm changeset publish`

## Prerequisites

- npm authentication configured
- All tests passing
- Clean git working directory
