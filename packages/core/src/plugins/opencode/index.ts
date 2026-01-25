import * as path from "node:path";

import { OVERRIDE_DIRS, TOOL_OUTPUT_DIRS, UNIFIED_DIR } from "../../constants";
import type {
  OutputFile,
  UnifiedState,
  ValidationResult,
} from "../../types/index";
import {
  deepMergeConfigs,
  fileExists,
  scanOverrideDirectory,
} from "../../utils/overrides";
import type { Plugin } from "../types";
import {
  transformMcpToOpenCode,
  transformPermissionsToOpenCode,
} from "./transforms";

/**
 * OpenCode plugin for exporting to opencode.json format
 *
 * Output structure:
 * - .opencode/AGENTS.md (symlink -> ../.ai/AGENTS.md)
 * - .opencode/rules/ (symlink -> ../.ai/rules)
 * - .opencode/skills/<name>/ (symlink -> ../../.ai/skills/<name>)
 * - opencode.json (generated config merged with .ai/.opencode/opencode.json)
 * - .opencode/<path> (symlink -> ../.ai/.opencode/<path>) for other override files
 */
export const opencodePlugin: Plugin = {
  id: "opencode",
  name: "OpenCode",

  async detect(_rootDir: string): Promise<boolean> {
    // TODO: Implement in v0.2
    return false;
  },

  async import(_rootDir: string): Promise<Partial<UnifiedState> | null> {
    // TODO: Implement in v0.2
    return null;
  },

  async export(state: UnifiedState, rootDir: string): Promise<OutputFile[]> {
    const files: OutputFile[] = [];
    const outputDir = TOOL_OUTPUT_DIRS.opencode;

    if (state.agents) {
      files.push({
        path: `${outputDir}/AGENTS.md`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/AGENTS.md`,
      });
    }

    if (state.rules.length > 0) {
      files.push({
        path: `${outputDir}/rules`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/rules`,
      });
    }

    for (const skill of state.skills) {
      files.push({
        path: `${outputDir}/skills/${skill.path}`,
        type: "symlink",
        target: `../../${UNIFIED_DIR}/skills/${skill.path}`,
      });
    }

    const baseConfig: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
    };
    if (state.rules.length > 0) {
      baseConfig["instructions"] = [`${outputDir}/rules/*.md`];
    }

    const mcp = transformMcpToOpenCode(state.settings?.mcpServers);
    if (mcp) {
      baseConfig["mcp"] = mcp;
    }

    const permission = transformPermissionsToOpenCode(
      state.settings?.permissions
    );
    if (permission) {
      baseConfig["permission"] = permission;
    }

    let finalConfig = baseConfig;
    if (state.settings?.overrides?.opencode) {
      finalConfig = deepMergeConfigs(
        baseConfig,
        state.settings.overrides.opencode
      );
    }

    files.push({
      path: "opencode.json",
      type: "json",
      content: finalConfig,
    });

    const overrideFiles = await scanOverrideDirectory(rootDir, "opencode");
    for (const overrideFile of overrideFiles) {
      const targetPath = path.join(
        rootDir,
        outputDir,
        overrideFile.relativePath
      );
      if (await fileExists(targetPath)) {
        continue;
      }
      files.push({
        path: `${outputDir}/${overrideFile.relativePath}`,
        type: "symlink",
        target: `../${UNIFIED_DIR}/${OVERRIDE_DIRS.opencode}/${overrideFile.relativePath}`,
      });
    }

    return files;
  },

  validate(state: UnifiedState): ValidationResult {
    const warnings: { path: string[]; message: string }[] = [];
    if (!state.agents) {
      warnings.push({
        path: ["AGENTS.md"],
        message: "No AGENTS.md found - .opencode/AGENTS.md will not be created",
      });
    }
    return { valid: true, errors: [], warnings, skipped: [] };
  },
};
