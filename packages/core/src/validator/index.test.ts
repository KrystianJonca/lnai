import { describe, expect, it } from "vitest";

import { createFullState, createMinimalState } from "../__tests__/utils";
import type { ToolId } from "../constants";
import {
  validateConfig,
  validateSettings,
  validateToolIds,
  validateUnifiedState,
} from "./index";

describe("validateToolIds", () => {
  it("returns valid for empty array", () => {
    const result = validateToolIds([]);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for valid tool IDs", () => {
    const result = validateToolIds(["claudeCode", "opencode"]);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns invalid with error for single invalid tool", () => {
    const result = validateToolIds(["invalidTool" as ToolId]);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("Invalid tool(s): invalidTool");
    expect(result.errors[0]?.path).toEqual(["tools"]);
  });

  it("returns invalid with error listing multiple invalid tools", () => {
    const result = validateToolIds(["foo", "bar"] as unknown as ToolId[]);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("foo");
    expect(result.errors[0]?.message).toContain("bar");
  });

  it("returns invalid when mixing valid and invalid tools", () => {
    const result = validateToolIds(["claudeCode", "invalidTool"] as ToolId[]);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("invalidTool");
    // Valid tool should not be in the invalid tools list
    expect(result.errors[0]?.value).toEqual(["invalidTool"]);
  });
});

describe("validateConfig", () => {
  it("returns valid for correct config", () => {
    const result = validateConfig({
      tools: {
        claudeCode: { enabled: true },
        opencode: { enabled: false, versionControl: true },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for empty config", () => {
    const result = validateConfig({});

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for config with only tools object", () => {
    const result = validateConfig({ tools: {} });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("ignores unknown tool ids (valid config)", () => {
    // Unknown tool IDs are stripped by the schema, not rejected
    const result = validateConfig({
      tools: {
        invalidTool: { enabled: true },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for invalid enabled type", () => {
    const result = validateConfig({
      tools: {
        claudeCode: { enabled: "yes" },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns errors for missing enabled field", () => {
    const result = validateConfig({
      tools: {
        claudeCode: { versionControl: true },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateSettings", () => {
  it("returns valid for null settings", () => {
    const result = validateSettings(null);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for undefined settings", () => {
    const result = validateSettings(undefined);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for empty settings", () => {
    const result = validateSettings({});

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for full settings", () => {
    const result = validateSettings({
      permissions: {
        allow: ["Bash(git:*)"],
        deny: ["Read(.env)"],
      },
      mcpServers: {
        db: { command: "npx", args: ["-y", "@example/db"] },
      },
      overrides: {
        claudeCode: { model: "claude-3-opus" },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for invalid permissions", () => {
    const result = validateSettings({
      permissions: {
        allow: "not-an-array",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.path).toContain("settings");
  });
});

describe("validateUnifiedState", () => {
  it("validates minimal state", () => {
    const state = createMinimalState();
    const result = validateUnifiedState(state);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    // Should have warning for missing AGENTS.md
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.message).toContain("AGENTS.md");
  });

  it("validates full state", () => {
    const state = createFullState();
    const result = validateUnifiedState(state);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    // No warnings when agents exists
    expect(result.warnings).toHaveLength(0);
  });

  it("aggregates config errors", () => {
    // Test with invalid tool config (not invalid tool id, since those are ignored)
    const state = createMinimalState({
      config: {
        tools: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          claudeCode: { enabled: "yes" } as any, // Invalid: enabled should be boolean
        },
      },
    });

    const result = validateUnifiedState(state);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("aggregates settings errors", () => {
    const state = createMinimalState({
      settings: {
        permissions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allow: "not-an-array" as any,
        },
      },
    });

    const result = validateUnifiedState(state);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates skill frontmatter and includes skill path in errors", () => {
    const state = createMinimalState({
      skills: [
        {
          path: "bad-skill",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          frontmatter: { name: "test" } as any, // Missing description
          content: "# Skill",
        },
      ],
    });

    const result = validateUnifiedState(state);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.path).toContain("skills");
    expect(result.errors[0]?.path).toContain("bad-skill");
  });

  it("validates rule frontmatter and includes rule path in errors", () => {
    const state = createMinimalState({
      rules: [
        {
          path: "bad-rule.md",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          frontmatter: { paths: [] } as any, // Empty paths array
          content: "# Rule",
        },
      ],
    });

    const result = validateUnifiedState(state);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.path).toContain("rules");
    expect(result.errors[0]?.path).toContain("bad-rule.md");
  });

  it("adds warning for missing AGENTS.md", () => {
    const state = createMinimalState({ agents: null });

    const result = validateUnifiedState(state);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.path).toContain("AGENTS.md");
    expect(result.warnings[0]?.message).toContain("not found");
  });

  it("no warning when AGENTS.md exists", () => {
    const state = createMinimalState({ agents: "# Instructions" });

    const result = validateUnifiedState(state);

    expect(result.warnings).toHaveLength(0);
  });

  it("validates multiple skills and rules", () => {
    const state = createMinimalState({
      agents: "# Agents",
      skills: [
        {
          path: "skill1",
          frontmatter: { name: "s1", description: "d1" },
          content: "# S1",
        },
        {
          path: "skill2",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          frontmatter: { name: "s2" } as any, // Invalid
          content: "# S2",
        },
      ],
      rules: [
        {
          path: "rule1.md",
          frontmatter: { paths: ["*.ts"] },
          content: "# R1",
        },
        {
          path: "rule2.md",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          frontmatter: {} as any, // Invalid
          content: "# R2",
        },
      ],
    });

    const result = validateUnifiedState(state);

    expect(result.valid).toBe(false);
    // Should have errors for skill2 and rule2
    expect(result.errors.length).toBe(2);
  });

  it("returns skipped array (empty for now)", () => {
    const state = createMinimalState();
    const result = validateUnifiedState(state);

    expect(result.skipped).toEqual([]);
  });
});
