import { describe, expect, it } from "vitest";

import { TOOL_IDS, UNIFIED_DIR } from "./constants.js";

describe("constants", () => {
  it("should export UNIFIED_DIR", () => {
    expect(UNIFIED_DIR).toBe(".ai");
  });

  it("should export TOOL_IDS", () => {
    expect(TOOL_IDS).toContain("claudeCode");
    expect(TOOL_IDS).toContain("opencode");
  });
});
