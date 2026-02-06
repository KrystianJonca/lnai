import { computeFilesToDelete, deleteFiles } from "../cleanup/index";
import type { ToolId } from "../constants";
import { ValidationError } from "../errors";
import {
  createEmptyManifest,
  readManifest,
  updateToolManifest,
  writeManifest,
} from "../manifest/index";
import { parseUnifiedConfig } from "../parser/index";
import { pluginRegistry } from "../plugins/index";
import type { ChangeResult, SyncResult } from "../types/index";
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
  /** Skip cleanup of orphaned files */
  skipCleanup?: boolean;
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
  const {
    rootDir,
    dryRun = false,
    skipCleanup = false,
    tools: requestedTools,
  } = options;

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

  // Load existing manifest for cleanup tracking
  let manifest = (await readManifest(rootDir)) ?? createEmptyManifest();

  const results: SyncResult[] = [];

  for (const toolId of toolsToSync) {
    const plugin = pluginRegistry.get(toolId);
    if (!plugin) {
      continue;
    }

    const validation = plugin.validate(state);
    const outputFiles = await plugin.export(state, rootDir);

    // Compute and perform deletions for orphaned files
    let deleteChanges: ChangeResult[] = [];
    if (!skipCleanup && manifest.tools[toolId]) {
      const toDelete = computeFilesToDelete(
        manifest.tools[toolId].files,
        outputFiles
      );
      deleteChanges = await deleteFiles(toDelete, rootDir, dryRun);
    }

    // Write new/updated files
    const writeChanges = await writeFiles(outputFiles, { rootDir, dryRun });

    // Combine delete and write changes
    const changes = [...deleteChanges, ...writeChanges];

    results.push({
      tool: toolId,
      changes,
      validation,
    });

    // Update manifest for this tool (only if not dry-run)
    if (!dryRun) {
      manifest = updateToolManifest(manifest, toolId, outputFiles);
    }
  }

  // Write updated manifest (only if not dry-run)
  if (!dryRun) {
    await writeManifest(rootDir, manifest);

    // Rebuild managed .gitignore entries from the latest manifest state.
    // This keeps .gitignore aligned when files are deleted or moved.
    const pathsToIgnore = Object.entries(manifest.tools).flatMap(
      ([toolId, toolManifest]) =>
        !state.config.tools?.[toolId as ToolId]?.versionControl &&
        toolManifest?.files
          ? toolManifest.files.map((file) => file.path)
          : []
    );
    await updateGitignore(rootDir, pathsToIgnore);
  }

  return results;
}
