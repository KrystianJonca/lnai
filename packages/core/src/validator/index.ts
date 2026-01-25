import type { z } from "zod";

import {
  configSchema,
  ruleFrontmatterSchema,
  settingsSchema,
  skillFrontmatterSchema,
} from "../schemas/index";
import type {
  UnifiedState,
  ValidationErrorDetail,
  ValidationResult,
} from "../types/index";

/**
 * Convert Zod issues to ValidationErrorDetail array
 */
function zodIssuesToErrors(
  issues: z.core.$ZodIssue[],
  prefix: string[] = []
): ValidationErrorDetail[] {
  return issues.map((issue) => ({
    path: [...prefix, ...issue.path.map(String)],
    message: issue.message,
    value: undefined,
  }));
}

/**
 * Validate config.json structure using Zod
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = configSchema.safeParse(config);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      skipped: [],
    };
  }

  return {
    valid: false,
    errors: zodIssuesToErrors(result.error.issues, ["config"]),
    warnings: [],
    skipped: [],
  };
}

/**
 * Validate settings.json structure using Zod
 */
export function validateSettings(settings: unknown): ValidationResult {
  if (settings === null || settings === undefined) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      skipped: [],
    };
  }

  const result = settingsSchema.safeParse(settings);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      skipped: [],
    };
  }

  return {
    valid: false,
    errors: zodIssuesToErrors(result.error.issues, ["settings"]),
    warnings: [],
    skipped: [],
  };
}

/**
 * Validate skill frontmatter
 */
function validateSkillFrontmatter(
  frontmatter: unknown,
  skillPath: string
): ValidationErrorDetail[] {
  const result = skillFrontmatterSchema.safeParse(frontmatter);

  if (result.success) {
    return [];
  }

  return zodIssuesToErrors(result.error.issues, [
    "skills",
    skillPath,
    "frontmatter",
  ]);
}

/**
 * Validate rule frontmatter
 */
function validateRuleFrontmatter(
  frontmatter: unknown,
  rulePath: string
): ValidationErrorDetail[] {
  const result = ruleFrontmatterSchema.safeParse(frontmatter);

  if (result.success) {
    return [];
  }

  return zodIssuesToErrors(result.error.issues, [
    "rules",
    rulePath,
    "frontmatter",
  ]);
}

/**
 * Validate the unified configuration state
 * @param state - Parsed unified state
 * @returns Validation result
 */
export function validateUnifiedState(state: UnifiedState): ValidationResult {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationErrorDetail[] = [];

  // 1. Validate config.json
  const configResult = validateConfig(state.config);
  errors.push(...configResult.errors);

  // 2. Validate settings.json
  const settingsResult = validateSettings(state.settings);
  errors.push(...settingsResult.errors);

  // 3. Validate each skill's frontmatter
  for (const skill of state.skills) {
    const skillErrors = validateSkillFrontmatter(skill.frontmatter, skill.path);
    errors.push(...skillErrors);
  }

  // 4. Validate each rule's frontmatter
  for (const rule of state.rules) {
    const ruleErrors = validateRuleFrontmatter(rule.frontmatter, rule.path);
    errors.push(...ruleErrors);
  }

  // 5. Add warnings for missing optional files
  if (!state.agents) {
    warnings.push({
      path: ["AGENTS.md"],
      message: "AGENTS.md not found - no main instructions will be exported",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    skipped: [],
  };
}
