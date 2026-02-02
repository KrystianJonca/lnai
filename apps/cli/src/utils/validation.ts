import { InvalidToolError, TOOL_IDS, type ToolId } from "@lnai/core";

export function validateToolIds(
  tools: string[] | undefined
): ToolId[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const invalid = tools.filter((t) => !TOOL_IDS.includes(t as ToolId));
  if (invalid.length > 0) {
    throw new InvalidToolError(invalid, [...TOOL_IDS]);
  }

  return tools as ToolId[];
}
