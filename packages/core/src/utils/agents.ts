import { UNIFIED_DIR } from "../constants";
import type {
  OutputFile,
  Permissions,
  UnifiedState,
  ValidationWarningDetail,
} from "../types/index";

/**
 * Create a root AGENTS.md symlink pointing to .ai/AGENTS.md.
 * Returns null if no agents content exists.
 */
export function createRootAgentsMdSymlink(
  state: UnifiedState
): OutputFile | null {
  if (!state.agents) {
    return null;
  }

  return {
    path: "AGENTS.md",
    type: "symlink",
    target: `${UNIFIED_DIR}/AGENTS.md`,
  };
}

/**
 * Create skill symlinks for a given output directory.
 * Calculates correct relative target paths based on directory depth.
 * The symlink sits at `<outputDir>/skills/<skillPath>`, so the depth
 * includes both the outputDir segments and the `skills/` segment.
 */
export function createSkillSymlinks(
  state: UnifiedState,
  outputDir: string
): OutputFile[] {
  // +1 for the "skills" directory between outputDir and the skill path
  const depth = outputDir.split("/").length + 1;
  const prefix = "../".repeat(depth);

  return state.skills.map((skill) => ({
    path: `${outputDir}/skills/${skill.path}`,
    type: "symlink" as const,
    target: `${prefix}${UNIFIED_DIR}/skills/${skill.path}`,
  }));
}

/**
 * Create a validation warning for missing AGENTS.md.
 */
export function createNoAgentsMdWarning(
  outputDescription: string
): ValidationWarningDetail {
  return {
    path: ["AGENTS.md"],
    message: `No AGENTS.md found - ${outputDescription} will not be created`,
  };
}

/**
 * Check if any permission rules (allow/ask/deny) are configured.
 */
export function hasPermissionsConfigured(
  permissions: Permissions | undefined
): boolean {
  if (!permissions) {
    return false;
  }

  return (
    (permissions.allow?.length ?? 0) > 0 ||
    (permissions.ask?.length ?? 0) > 0 ||
    (permissions.deny?.length ?? 0) > 0
  );
}
