import { checkbox, select } from "@inquirer/prompts";
import { TOOL_IDS, type ToolId } from "@lnai/core";

export interface InitPromptAnswers {
  tools: ToolId[];
  versionControl: Record<ToolId, boolean>;
}

export async function runInitPrompts(): Promise<InitPromptAnswers> {
  const tools = await promptForTools();
  const versionControl = await promptForVersionControl(tools);
  return { tools, versionControl };
}

export function isInteractiveEnvironment(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

// --- Helper functions ---

const TOOL_DISPLAY_NAMES: Record<ToolId, string> = {
  claudeCode: "Claude Code (.claude/)",
  opencode: "Opencode (.opencode/)",
  cursor: "Cursor (.cursor/)",
  copilot: "Copilot (.github/)",
  windsurf: "Windsurf (.windsurf/)",
};

async function promptForTools(): Promise<ToolId[]> {
  return checkbox({
    message: "Which tools would you like to configure?",
    choices: TOOL_IDS.map((id) => ({
      name: TOOL_DISPLAY_NAMES[id],
      value: id,
      checked: true,
    })),
    required: true,
  });
}

async function promptForVersionControl(
  tools: ToolId[]
): Promise<Record<ToolId, boolean>> {
  const mode = await select({
    message: "How would you like to handle version control?",
    choices: [
      { name: "Ignore all (add to .gitignore)", value: "ignore-all" },
      { name: "Version control all", value: "version-all" },
      { name: "Configure per tool", value: "per-tool" },
    ],
  });

  const result = {} as Record<ToolId, boolean>;

  if (mode === "ignore-all") {
    for (const tool of tools) {
      result[tool] = false;
    }
  } else if (mode === "version-all") {
    for (const tool of tools) {
      result[tool] = true;
    }
  } else {
    const versionControlled = await checkbox({
      message: "Select tools to version control:",
      choices: tools.map((id) => ({ name: TOOL_DISPLAY_NAMES[id], value: id })),
    });
    for (const tool of tools) {
      result[tool] = versionControlled.includes(tool);
    }
  }

  return result;
}
