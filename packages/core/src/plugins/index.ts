import { claudeCodePlugin } from "./claude-code/index";
import { codexPlugin } from "./codex/index";
import { copilotPlugin } from "./copilot/index";
import { cursorPlugin } from "./cursor/index";
import { geminiPlugin } from "./gemini/index";
import { opencodePlugin } from "./opencode/index";
import { pluginRegistry } from "./registry";
import { windsurfPlugin } from "./windsurf/index";

export {
  claudeCodePlugin,
  codexPlugin,
  copilotPlugin,
  cursorPlugin,
  geminiPlugin,
  opencodePlugin,
  pluginRegistry,
  windsurfPlugin,
};
export type { Plugin } from "./types";

pluginRegistry.register(claudeCodePlugin);
pluginRegistry.register(copilotPlugin);
pluginRegistry.register(cursorPlugin);
pluginRegistry.register(codexPlugin);
pluginRegistry.register(opencodePlugin);
pluginRegistry.register(windsurfPlugin);
pluginRegistry.register(geminiPlugin);
