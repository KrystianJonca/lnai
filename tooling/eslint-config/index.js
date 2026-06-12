import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.js", "**/*.mjs"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        projectService: {
          // ** is not allowed here. Covers package-root config files for
          // per-package eslint runs (cwd = package) and apps/*, packages/*
          // config files for repo-root runs (lint-staged). No deeper glob:
          // files like apps/docs/src/content.config.ts are already in their
          // project (Astro's tsconfig includes **/*) and listing them here
          // would conflict.
          allowDefaultProject: ["*.config.ts", "*/*/*.config.ts"],
        },
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // TypeScript rules
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Import rules
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // General rules
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },
];
