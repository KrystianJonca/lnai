import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  hasUnifiedConfig,
  initUnifiedConfig,
  type ToolId,
  UNIFIED_DIR,
} from "@lnai/core";
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
      const exists = await hasUnifiedConfig(rootDir);

      if (exists && !options.force) {
        spinner.fail(
          `Directory ${UNIFIED_DIR}/ already exists. Use --force to overwrite.`
        );
        process.exit(1);
      }

      if (exists && options.force) {
        await fs.rm(path.join(rootDir, UNIFIED_DIR), {
          recursive: true,
          force: true,
        });
      }

      const result = await initUnifiedConfig({
        rootDir,
        tools: options.tools as ToolId[] | undefined,
        minimal: options.minimal,
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
