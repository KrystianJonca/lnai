import type { ToolId } from "../constants";
import { parseUnifiedConfig } from "../parser/index";
import { pluginRegistry } from "../plugins/index";
import type { SyncResult } from "../types/index";
import { validateUnifiedState } from "../validator/index";
import { updateGitignore, writeFiles } from "../writer/index";

/**
 * Options for the sync pipeline
 */
export interface SyncOptions {
  /** Root directory containing .ai/ config */
  rootDir: string;
  /** Only sync specific tools (default: all enabled) */
  tools?: ToolId[];
  /** Preview changes without writing files */
  dryRun?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
}

function getToolsToSync(
  config: {
    tools?: Partial<
      Record<ToolId, { enabled: boolean; versionControl?: boolean }>
    >;
  },
  requestedTools?: ToolId[]
): ToolId[] {
  if (requestedTools && requestedTools.length > 0) {
    return requestedTools.filter((tool) => pluginRegistry.has(tool));
  }

  const enabledTools: ToolId[] = [];

  if (config.tools) {
    for (const [toolId, toolConfig] of Object.entries(config.tools)) {
      if (toolConfig?.enabled && pluginRegistry.has(toolId as ToolId)) {
        enabledTools.push(toolId as ToolId);
      }
    }
  }

  if (enabledTools.length === 0) {
    return pluginRegistry.getIds();
  }

  return enabledTools;
}

/**
 * Run the sync pipeline to export .ai/ config to native tool formats.
 */
export async function runSyncPipeline(
  options: SyncOptions
): Promise<SyncResult[]> {
  const { rootDir, dryRun = false, tools: requestedTools } = options;

  const state = await parseUnifiedConfig(rootDir);

  const unifiedValidation = validateUnifiedState(state);
  if (!unifiedValidation.valid) {
    return [
      {
        tool: "claudeCode" as ToolId,
        changes: [],
        validation: unifiedValidation,
      },
    ];
  }

  const toolsToSync = getToolsToSync(state.config, requestedTools);

  if (toolsToSync.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];
  const pathsToIgnore: string[] = [];

  for (const toolId of toolsToSync) {
    const plugin = pluginRegistry.get(toolId);
    if (!plugin) {
      continue;
    }

    const validation = plugin.validate(state);
    const outputFiles = await plugin.export(state, rootDir);
    const changes = await writeFiles(outputFiles, { rootDir, dryRun });

    results.push({
      tool: toolId,
      changes,
      validation,
    });

    const toolConfig = state.config.tools?.[toolId];
    if (!toolConfig?.versionControl) {
      pathsToIgnore.push(...outputFiles.map((f) => f.path));
    }
  }

  if (pathsToIgnore.length > 0 && !dryRun) {
    await updateGitignore(rootDir, pathsToIgnore);
  }

  return results;
}
