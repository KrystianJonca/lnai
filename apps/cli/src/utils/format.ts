import chalk from "chalk";

export const GITHUB_URL = "https://github.com/KrystianJonca/lnai";

export interface ValidationItem {
  path: string[];
  message: string;
}

/**
 * Format a single validation item (error or warning) as a string.
 */
export function formatValidationItem(
  item: ValidationItem,
  color: "red" | "yellow"
): string {
  const colorFn = color === "red" ? chalk.red : chalk.yellow;
  return colorFn(`  - ${item.path.join(".")}: ${item.message}`);
}

/**
 * Print a list of validation items to the console.
 */
export function printValidationItems(
  items: ValidationItem[],
  color: "red" | "yellow"
): void {
  for (const item of items) {
    console.log(formatValidationItem(item, color));
  }
}

/**
 * Print the GitHub promo message.
 */
export function printGitHubPromo(): void {
  console.log(
    chalk.gray("\nIf you find LNAI helpful, please star us on GitHub:")
  );
  console.log(chalk.blue(GITHUB_URL));
}
