import { claudeCodePlugin } from "./claude-code/index";
import { copilotPlugin } from "./copilot/index";
import { cursorPlugin } from "./cursor/index";
import { opencodePlugin } from "./opencode/index";
import { windsurfPlugin } from "./windsurf/index";
import { pluginRegistry } from "./registry";

export { claudeCodePlugin, copilotPlugin, cursorPlugin, opencodePlugin, windsurfPlugin, pluginRegistry };
export type { Plugin } from "./types";

pluginRegistry.register(claudeCodePlugin);
pluginRegistry.register(copilotPlugin);
pluginRegistry.register(cursorPlugin);
pluginRegistry.register(opencodePlugin);
pluginRegistry.register(windsurfPlugin);
