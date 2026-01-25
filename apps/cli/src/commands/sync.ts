import { runSyncPipeline, type ToolId } from "@lnai/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

export const syncCommand = new Command("sync")
  .description("Export .ai/ to native configs")
  .option("--dry-run", "Preview without writing")
  .option("-t, --tools <tools...>", "Filter to specific tools")
  .option("-v, --verbose", "Detailed output")
  .action(async (options) => {
    const spinner = ora("Syncing configuration...").start();

    try {
      const results = await runSyncPipeline({
        rootDir: process.cwd(),
        dryRun: options.dryRun,
        tools: options.tools as ToolId[] | undefined,
        verbose: options.verbose,
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
    } catch (error) {
      spinner.fail("Sync failed");
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });
