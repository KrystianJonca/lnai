import { Command } from "commander";

import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";
import { validateCommand } from "./commands/validate.js";

const program = new Command();

program
  .name("lnai")
  .description(
    "CLI tool that syncs a unified .ai/ config to native formats for AI coding tools"
  )
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(validateCommand);

program.parse();
