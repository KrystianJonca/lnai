import { claudeCodePlugin } from "./claude-code/index";
import { cursorPlugin } from "./cursor/index";
import { opencodePlugin } from "./opencode/index";
import { pluginRegistry } from "./registry";

export { claudeCodePlugin, cursorPlugin, opencodePlugin, pluginRegistry };
export type { Plugin } from "./types";

pluginRegistry.register(claudeCodePlugin);
pluginRegistry.register(cursorPlugin);
pluginRegistry.register(opencodePlugin);
