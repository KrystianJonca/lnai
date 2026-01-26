import { initUnifiedConfig, type ToolId } from "@lnai/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

export const initCommand = new Command("init")
  .description("Initialize a new .ai/ configuration directory")
  .option("--force", "Overwrite existing .ai/ directory")
  .option("--minimal", "Create only config.json (no subdirectories)")
  .option("-t, --tools <tools...>", "Enable only specific tools")
  .action(async (options) => {
    const rootDir = process.cwd();
    const spinner = ora("Initializing .ai/ configuration...").start();

    try {
      const result = await initUnifiedConfig({
        rootDir,
        tools: options.tools as ToolId[] | undefined,
        minimal: options.minimal,
        force: options.force,
      });

      spinner.succeed("Initialized .ai/ configuration");

      console.log(chalk.gray("\nCreated:"));
      for (const file of result.created) {
        console.log(chalk.green(`  + ${file}`));
      }

      console.log(
        chalk.gray("\nRun ") +
          chalk.cyan("lnai sync") +
          chalk.gray(" to generate tool configs.")
      );
    } catch (error) {
      spinner.fail("Initialization failed");
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });
