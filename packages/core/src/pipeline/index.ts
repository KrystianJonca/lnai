import type { ToolId } from "../constants";
import { ValidationError } from "../errors";
import { parseUnifiedConfig } from "../parser/index";
import { pluginRegistry } from "../plugins/index";
import type { SyncResult } from "../types/index";
import { validateToolIds, validateUnifiedState } from "../validator/index";
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

  if (requestedTools && requestedTools.length > 0) {
    const toolValidation = validateToolIds(requestedTools);
    if (!toolValidation.valid) {
      const error = toolValidation.errors[0];
      throw new ValidationError(
        error?.message ?? "Invalid tools",
        error?.path ?? ["tools"],
        error?.value
      );
    }
  }

  const state = await parseUnifiedConfig(rootDir);

  const unifiedValidation = validateUnifiedState(state);
  if (!unifiedValidation.valid) {
    const errorMessages = unifiedValidation.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new ValidationError(
      `Unified config validation failed: ${errorMessages}`,
      ["config"],
      unifiedValidation.errors
    );
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
