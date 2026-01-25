#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { hasUnifiedConfig, UNIFIED_DIR, initUnifiedConfig, runSyncPipeline, parseUnifiedConfig, validateUnifiedState, pluginRegistry } from '@lnai/core';
import chalk3 from 'chalk';
import ora from 'ora';

var initCommand = new Command("init").description("Initialize a new .ai/ configuration directory").option("--force", "Overwrite existing .ai/ directory").option("--minimal", "Create only config.json (no subdirectories)").option("-t, --tools <tools...>", "Enable only specific tools").action(async (options) => {
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
        force: true
      });
    }
    const result = await initUnifiedConfig({
      rootDir,
      tools: options.tools,
      minimal: options.minimal
    });
    spinner.succeed("Initialized .ai/ configuration");
    console.log(chalk3.gray("\nCreated:"));
    for (const file of result.created) {
      console.log(chalk3.green(`  + ${file}`));
    }
    console.log(
      chalk3.gray("\nRun ") + chalk3.cyan("lnai sync") + chalk3.gray(" to generate tool configs.")
    );
  } catch (error) {
    spinner.fail("Initialization failed");
    console.error(
      chalk3.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
});
var syncCommand = new Command("sync").description("Export .ai/ to native configs").option("--dry-run", "Preview without writing").option("-t, --tools <tools...>", "Filter to specific tools").option("-v, --verbose", "Detailed output").action(async (options) => {
  const spinner = ora("Syncing configuration...").start();
  try {
    const results = await runSyncPipeline({
      rootDir: process.cwd(),
      dryRun: options.dryRun,
      tools: options.tools,
      verbose: options.verbose
    });
    spinner.succeed("Sync complete");
    if (results.length === 0) {
      console.log(chalk3.yellow("\nNo tools configured or enabled."));
      return;
    }
    for (const result of results) {
      console.log(chalk3.blue(`
${result.tool}:`));
      if (result.changes.length === 0) {
        console.log(chalk3.gray("  No changes"));
      }
      for (const change of result.changes) {
        const icon = change.action === "create" ? chalk3.green("+") : change.action === "update" ? chalk3.yellow("~") : change.action === "delete" ? chalk3.red("-") : chalk3.gray("=");
        console.log(`  ${icon} ${change.path}`);
      }
    }
  } catch (error) {
    spinner.fail("Sync failed");
    console.error(
      chalk3.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
});
var validateCommand = new Command("validate").description("Validate .ai/ configuration").option("-t, --tools <tools...>", "Filter to specific tools").action(async (options) => {
  const spinner = ora("Validating configuration...").start();
  try {
    const rootDir = process.cwd();
    const state = await parseUnifiedConfig(rootDir);
    const unifiedResult = validateUnifiedState(state);
    if (!unifiedResult.valid) {
      spinner.fail("Validation failed");
      console.log(chalk3.red("\nUnified config errors:"));
      for (const error of unifiedResult.errors) {
        console.log(
          chalk3.red(`  - ${error.path.join(".")}: ${error.message}`)
        );
      }
      process.exit(1);
    }
    const tools = options.tools ?? pluginRegistry.getIds();
    const toolErrors = [];
    const toolWarnings = [];
    const toolSkipped = [];
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
        console.log(chalk3.red(`
${plugin} errors:`));
        for (const error of errors) {
          console.log(
            chalk3.red(`  - ${error.path.join(".")}: ${error.message}`)
          );
        }
      }
      process.exit(1);
    }
    spinner.succeed("Validation passed");
    for (const { plugin, warnings } of toolWarnings) {
      console.log(chalk3.yellow(`
${plugin} warnings:`));
      for (const warning of warnings) {
        console.log(
          chalk3.yellow(`  - ${warning.path.join(".")}: ${warning.message}`)
        );
      }
    }
    for (const { plugin, skipped } of toolSkipped) {
      console.log(chalk3.gray(`
${plugin} skipped features:`));
      for (const item of skipped) {
        console.log(chalk3.gray(`  - ${item.feature}: ${item.reason}`));
      }
    }
  } catch (error) {
    spinner.fail("Validation failed");
    console.error(
      chalk3.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
});

// src/index.ts
var program = new Command();
program.name("lnai").description(
  "CLI tool that syncs a unified .ai/ config to native formats for AI coding tools"
).version("0.1.0");
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(validateCommand);
program.parse();
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map