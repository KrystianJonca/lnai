import { initUnifiedConfig, type ToolId } from "@lnai/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { isInteractiveEnvironment, runInitPrompts } from "../prompts/init";
import { printGitHubPromo } from "../utils/format";

interface InitCommandOptions {
  force?: boolean;
  minimal?: boolean;
  tools?: string[];
  yes?: boolean;
}

export const initCommand = new Command("init")
  .description("Initialize a new .ai/ configuration directory")
  .option("--force", "Overwrite existing .ai/ directory")
  .option("--minimal", "Create only config.json (no subdirectories)")
  .option("-t, --tools <tools...>", "Enable only specific tools")
  .option("-y, --yes", "Skip prompts and use defaults")
  .action(async (options: InitCommandOptions) => {
    const rootDir = process.cwd();

    let tools: ToolId[] | undefined = options.tools as ToolId[] | undefined;
    let versionControl: Record<ToolId, boolean> | undefined;

    if (shouldRunInteractive(options)) {
      try {
        const answers = await runInitPrompts();
        tools = answers.tools;
        versionControl = answers.versionControl;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("User force closed")
        ) {
          console.log(chalk.gray("\nAborted."));
          process.exit(0);
        }
        throw error;
      }
    }

    const spinner = ora("Initializing .ai/ configuration...").start();

    try {
      const result = await initUnifiedConfig({
        rootDir,
        tools,
        minimal: options.minimal,
        force: options.force,
        versionControl,
      });

      spinner.succeed("Initialized .ai/ configuration");

      console.log(chalk.gray("\nCreated:"));
      for (const file of result.created) {
        console.log(chalk.green(`  + ${file}`));
      }

      console.log(chalk.gray("\nNext steps:"));
      console.log(
        chalk.gray("  1. Configure ") +
          chalk.cyan(".ai/") +
          chalk.gray(" (rules, skills, mcps, permissions)")
      );
      console.log(
        chalk.gray("  2. Run ") +
          chalk.cyan("lnai sync") +
          chalk.gray(" to generate tool configs")
      );

      printGitHubPromo();
    } catch (error) {
      spinner.fail("Initialization failed");
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });

// --- Helper functions ---

function shouldRunInteractive(options: InitCommandOptions): boolean {
  if (options.yes) {
    return false;
  }
  if (options.tools?.length) {
    return false;
  }
  if (!isInteractiveEnvironment()) {
    return false;
  }
  return true;
}
