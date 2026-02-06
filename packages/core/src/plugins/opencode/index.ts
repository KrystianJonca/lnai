import { TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  UnifiedState,
  ValidationResult,
  ValidationWarningDetail,
} from "../../types/index";
import {
  createNoAgentsMdWarning,
  createRootAgentsMdSymlink,
  createSkillSymlinks,
} from "../../utils/agents";
import { validateMcpServers } from "../../utils/mcp";
import { applyFileOverrides } from "../../utils/overrides";
import type { Plugin } from "../types";
import {
  transformMcpToOpenCode,
  transformPermissionsToOpenCode,
} from "./transforms";

const OUTPUT_DIR = TOOL_OUTPUT_DIRS.opencode;
const SKILLS_DIR = ".agents";

/**
 * OpenCode plugin for exporting to opencode.json format
 *
 * Output structure:
 * - AGENTS.md (symlink -> .ai/AGENTS.md) [at project root]
 * - .opencode/rules/ (symlink -> ../.ai/rules)
 * - .agents/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - opencode.json (generated config merged with .ai/.opencode/opencode.json)
 * - .opencode/<path> (symlink -> ../.ai/.opencode/<path>) for other override files
 */
export const opencodePlugin: Plugin = {
  id: "opencode",
  name: "OpenCode",

  async detect(_rootDir: string): Promise<boolean> {
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];

    const agentsSymlink = createRootAgentsMdSymlink(state);
    if (agentsSymlink) {
      files.push(agentsSymlink);
    }

    if (state.rules.length > 0) {
      files.push({
        path: `${OUTPUT_DIR}/rules`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/rules`,
      });
    }

    // Skills go to .agents/skills/ (cross-tool standard path)
    files.push(...createSkillSymlinks(state, SKILLS_DIR));

    const config: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
    };
    if (state.rules.length > 0) {
      config["instructions"] = [`${OUTPUT_DIR}/rules/*.md`];
    }

    const mcp = transformMcpToOpenCode(state.settings?.mcpServers);
    if (mcp) {
      config["mcp"] = mcp;
    }

    const permission = transformPermissionsToOpenCode(
      state.settings?.permissions
    );
    if (permission) {
      config["permission"] = permission;
    }

    files.push({
      path: "opencode.json",
      type: "json",
      content: config,
    });

    return applyFileOverrides(files, rootDir, "opencode");
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: ValidationWarningDetail[] = [];

    if (!state.agents) {
      warnings.push(createNoAgentsMdWarning("root AGENTS.md"));
    }

    // Validate MCP servers
    warnings.push(
      ...validateMcpServers(state.settings?.mcpServers, [
        "settings",
        "mcpServers",
      ])
    );

    return { valid: true, errors: [], warnings, skipped: [] };
  },
};
