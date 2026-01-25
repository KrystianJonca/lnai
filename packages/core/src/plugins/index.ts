import { claudeCodePlugin } from "./claude-code/index";
import { opencodePlugin } from "./opencode/index";
import { pluginRegistry } from "./registry";

export { claudeCodePlugin, opencodePlugin, pluginRegistry };
export type { Plugin } from "./types";

pluginRegistry.register(claudeCodePlugin);
pluginRegistry.register(opencodePlugin);
