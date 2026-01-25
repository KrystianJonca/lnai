import {
  parseUnifiedConfig,
  pluginRegistry,
  type ToolId,
  validateUnifiedState,
} from "@lnai/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

export const validateCommand = new Command("validate")
  .description("Validate .ai/ configuration")
  .option("-t, --tools <tools...>", "Filter to specific tools")
  .action(async (options) => {
    const spinner = ora("Validating configuration...").start();

    try {
      const rootDir = process.cwd();
      const state = await parseUnifiedConfig(rootDir);

      const unifiedResult = validateUnifiedState(state);

      if (!unifiedResult.valid) {
        spinner.fail("Validation failed");
        console.log(chalk.red("\nUnified config errors:"));
        for (const error of unifiedResult.errors) {
          console.log(
            chalk.red(`  - ${error.path.join(".")}: ${error.message}`)
          );
        }
        process.exit(1);
      }

      const tools =
        (options.tools as ToolId[] | undefined) ?? pluginRegistry.getIds();

      const toolErrors: Array<{
        plugin: string;
        errors: typeof unifiedResult.errors;
      }> = [];
      const toolWarnings: Array<{
        plugin: string;
        warnings: typeof unifiedResult.errors;
      }> = [];
      const toolSkipped: Array<{
        plugin: string;
        skipped: Array<{ feature: string; reason: string }>;
      }> = [];

      for (const toolId of tools) {
        const plugin = pluginRegistry.get(toolId);
        if (!plugin) {
          continue;
        }

        const result = plugin.validate(state);

        if (!result.valid) {
          toolErrors.push({ plugin: plugin.name, errors: result.errors });
        }

        if (result.warnings.length > 0) {
          toolWarnings.push({ plugin: plugin.name, warnings: result.warnings });
        }

        if (result.skipped.length > 0) {
          toolSkipped.push({ plugin: plugin.name, skipped: result.skipped });
        }
      }

      if (toolErrors.length > 0) {
        spinner.fail("Validation failed");
        for (const { plugin, errors } of toolErrors) {
          console.log(chalk.red(`\n${plugin} errors:`));
          for (const error of errors) {
            console.log(
              chalk.red(`  - ${error.path.join(".")}: ${error.message}`)
            );
          }
        }
        process.exit(1);
      }

      spinner.succeed("Validation passed");

      for (const { plugin, warnings } of toolWarnings) {
        console.log(chalk.yellow(`\n${plugin} warnings:`));
        for (const warning of warnings) {
          console.log(
            chalk.yellow(`  - ${warning.path.join(".")}: ${warning.message}`)
          );
        }
      }

      for (const { plugin, skipped } of toolSkipped) {
        console.log(chalk.gray(`\n${plugin} skipped features:`));
        for (const item of skipped) {
          console.log(chalk.gray(`  - ${item.feature}: ${item.reason}`));
        }
      }
    } catch (error) {
      spinner.fail("Validation failed");
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });
