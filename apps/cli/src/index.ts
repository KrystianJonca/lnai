import { createRequire } from "node:module";

import { Command } from "commander";

import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";
import { validateCommand } from "./commands/validate.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("lnai")
  .description(
    "CLI tool that syncs a unified .ai/ config to native formats for AI coding tools"
  )
  .version(pkg.version);

program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(validateCommand);

program.parse();
