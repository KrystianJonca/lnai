import {
  FileNotFoundError,
  InvalidToolError,
  ParseError,
  PluginError,
  runSyncPipeline,
  WriteError,
} from "@lnai/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { printGitHubPromo, printValidationItems } from "../utils/format";
import { validateToolIds } from "../utils/validation";

export const syncCommand = new Command("sync")
  .description("Export .ai/ to native configs")
  .option("--dry-run", "Preview without writing")
  .option("-t, --tools <tools...>", "Filter to specific tools")
  .action(async (options) => {
    let tools;
    try {
      tools = validateToolIds(options.tools);
    } catch (error) {
      if (error instanceof InvalidToolError) {
        console.error(chalk.red(error.message));
        process.exit(1);
      }
      throw error;
    }
    const spinner = ora("Syncing configuration...").start();

    try {
      const results = await runSyncPipeline({
        rootDir: process.cwd(),
        dryRun: options.dryRun,
        tools,
      });

      spinner.succeed("Sync complete");

      if (results.length === 0) {
        console.log(chalk.yellow("\nNo tools configured or enabled."));
        return;
      }

      for (const result of results) {
        console.log(chalk.blue(`\n${result.tool}:`));

        if (result.changes.length === 0) {
          console.log(chalk.gray("  No changes"));
        }

        for (const change of result.changes) {
          const icon =
            change.action === "create"
              ? chalk.green("+")
              : change.action === "update"
                ? chalk.yellow("~")
                : change.action === "delete"
                  ? chalk.red("-")
                  : chalk.gray("=");
          console.log(`  ${icon} ${change.path}`);
        }
      }

      // Display validation errors for synced tools
      for (const result of results) {
        if (result.validation.errors.length > 0) {
          console.log(chalk.red(`\n${result.tool} errors:`));
          printValidationItems(result.validation.errors, "red");
        }
      }

      // Display validation warnings for synced tools
      for (const result of results) {
        if (result.validation.warnings.length > 0) {
          console.log(chalk.yellow(`\n${result.tool} warnings:`));
          printValidationItems(result.validation.warnings, "yellow");
        }
      }

      printGitHubPromo();
    } catch (error) {
      spinner.fail("Sync failed");

      if (error instanceof ParseError) {
        console.error(
          chalk.red(`Parse error in ${error.filePath}: ${error.message}`)
        );
      } else if (error instanceof WriteError) {
        console.error(
          chalk.red(`Failed to write ${error.filePath}: ${error.message}`)
        );
      } else if (error instanceof FileNotFoundError) {
        console.error(chalk.red(`File not found: ${error.filePath}`));
      } else if (error instanceof PluginError) {
        console.error(
          chalk.red(`Plugin error (${error.pluginId}): ${error.message}`)
        );
      } else {
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
      }

      process.exit(1);
    }
  });
