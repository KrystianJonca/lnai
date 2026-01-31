import { claudeCodePlugin } from "./claude-code/index";
import { copilotPlugin } from "./copilot/index";
import { cursorPlugin } from "./cursor/index";
import { opencodePlugin } from "./opencode/index";
import { pluginRegistry } from "./registry";
import { windsurfPlugin } from "./windsurf/index";

export {
  claudeCodePlugin,
  copilotPlugin,
  cursorPlugin,
  opencodePlugin,
  pluginRegistry,
  windsurfPlugin,
};
export type { Plugin } from "./types";

pluginRegistry.register(claudeCodePlugin);
pluginRegistry.register(copilotPlugin);
pluginRegistry.register(cursorPlugin);
pluginRegistry.register(opencodePlugin);
pluginRegistry.register(windsurfPlugin);
