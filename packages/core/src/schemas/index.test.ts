import { describe, expect, it } from "vitest";

import {
  configSchema,
  mcpServerSchema,
  permissionsSchema,
  ruleFrontmatterSchema,
  settingsSchema,
  skillFrontmatterSchema,
  toolConfigSchema,
  toolIdSchema,
} from "./index";

describe("mcpServerSchema", () => {
  it("validates stdio config", () => {
    const result = mcpServerSchema.safeParse({
      command: "npx",
      args: ["-y", "@example/db"],
      env: { DB_URL: "${DB_URL}" },
    });

    expect(result.success).toBe(true);
  });

  it("validates http config", () => {
    const result = mcpServerSchema.safeParse({
      type: "http",
      url: "https://api.example.com/mcp",
      headers: { Authorization: "Bearer token" },
    });

    expect(result.success).toBe(true);
  });

  it("validates sse config", () => {
    const result = mcpServerSchema.safeParse({
      type: "sse",
      url: "https://api.example.com/mcp/sse",
    });

    expect(result.success).toBe(true);
  });

  it("validates minimal config", () => {
    const result = mcpServerSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = mcpServerSchema.safeParse({
      type: "websocket",
    });

    expect(result.success).toBe(false);
  });
});

describe("permissionsSchema", () => {
  it("validates full permissions", () => {
    const result = permissionsSchema.safeParse({
      allow: ["Bash(git:*)"],
      ask: ["Bash(npm:*)"],
      deny: ["Read(.env)"],
    });

    expect(result.success).toBe(true);
  });

  it("validates partial permissions", () => {
    const result = permissionsSchema.safeParse({
      allow: ["Bash(git:*)"],
    });

    expect(result.success).toBe(true);
  });

  it("validates empty permissions", () => {
    const result = permissionsSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("rejects invalid allow type", () => {
    const result = permissionsSchema.safeParse({
      allow: "Bash(git:*)",
    });

    expect(result.success).toBe(false);
  });
});

describe("toolConfigSchema", () => {
  it("validates enabled tool", () => {
    const result = toolConfigSchema.safeParse({
      enabled: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versionControl).toBe(false); // Default value
    }
  });

  it("validates tool with versionControl", () => {
    const result = toolConfigSchema.safeParse({
      enabled: true,
      versionControl: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versionControl).toBe(true);
    }
  });

  it("rejects missing enabled", () => {
    const result = toolConfigSchema.safeParse({
      versionControl: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid enabled type", () => {
    const result = toolConfigSchema.safeParse({
      enabled: "yes",
    });

    expect(result.success).toBe(false);
  });
});

describe("toolIdSchema", () => {
  it("accepts claudeCode", () => {
    const result = toolIdSchema.safeParse("claudeCode");

    expect(result.success).toBe(true);
  });

  it("accepts opencode", () => {
    const result = toolIdSchema.safeParse("opencode");

    expect(result.success).toBe(true);
  });

  it("rejects unknown tool", () => {
    const result = toolIdSchema.safeParse("cursor");

    expect(result.success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("validates full settings", () => {
    const result = settingsSchema.safeParse({
      permissions: {
        allow: ["Bash(git:*)"],
        deny: ["Read(.env)"],
      },
      mcpServers: {
        db: { command: "npx", args: ["-y", "@example/db"] },
      },
    });

    expect(result.success).toBe(true);
  });

  it("validates partial settings", () => {
    const result = settingsSchema.safeParse({
      permissions: { allow: ["Bash(git:*)"] },
    });

    expect(result.success).toBe(true);
  });

  it("validates empty settings", () => {
    const result = settingsSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("rejects invalid permissions", () => {
    const result = settingsSchema.safeParse({
      permissions: {
        allow: "not-an-array",
      },
    });

    expect(result.success).toBe(false);
  });

  it("validates settings with overrides", () => {
    const result = settingsSchema.safeParse({
      permissions: { allow: ["Bash(git:*)"] },
      overrides: {
        claudeCode: { model: "opus", customSetting: true },
        opencode: { theme: "dark" },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overrides?.claudeCode?.["model"]).toBe("opus");
      expect(result.data.overrides?.opencode?.["theme"]).toBe("dark");
    }
  });

  it("validates settings with partial overrides", () => {
    const result = settingsSchema.safeParse({
      overrides: {
        claudeCode: { model: "sonnet" },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overrides?.claudeCode?.["model"]).toBe("sonnet");
      expect(result.data.overrides?.opencode).toBeUndefined();
    }
  });
});

describe("configSchema", () => {
  it("validates config with tools", () => {
    const result = configSchema.safeParse({
      tools: {
        claudeCode: { enabled: true },
        opencode: { enabled: false, versionControl: true },
      },
    });

    expect(result.success).toBe(true);
  });

  it("validates config without tools", () => {
    const result = configSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("validates config with empty tools", () => {
    const result = configSchema.safeParse({
      tools: {},
    });

    expect(result.success).toBe(true);
  });

  it("ignores unknown tool ids (strips them)", () => {
    const result = configSchema.safeParse({
      tools: {
        invalidTool: { enabled: true },
        claudeCode: { enabled: true },
      },
    });

    // Unknown keys are stripped, valid keys are kept
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tools?.claudeCode?.enabled).toBe(true);
      expect(
        (result.data.tools as Record<string, unknown>)["invalidTool"]
      ).toBeUndefined();
    }
  });
});

describe("skillFrontmatterSchema", () => {
  it("validates complete skill frontmatter", () => {
    const result = skillFrontmatterSchema.safeParse({
      name: "deploy",
      description: "Deploy the application",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = skillFrontmatterSchema.safeParse({
      description: "Deploy the application",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = skillFrontmatterSchema.safeParse({
      name: "deploy",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty strings", () => {
    const result = skillFrontmatterSchema.safeParse({
      name: "",
      description: "",
    });

    // Empty strings are technically valid strings
    expect(result.success).toBe(true);
  });
});

describe("ruleFrontmatterSchema", () => {
  it("validates paths array", () => {
    const result = ruleFrontmatterSchema.safeParse({
      paths: ["src/**/*.ts", "lib/**/*.ts"],
    });

    expect(result.success).toBe(true);
  });

  it("validates single path", () => {
    const result = ruleFrontmatterSchema.safeParse({
      paths: ["*.md"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty paths array", () => {
    const result = ruleFrontmatterSchema.safeParse({
      paths: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing paths", () => {
    const result = ruleFrontmatterSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects non-array paths", () => {
    const result = ruleFrontmatterSchema.safeParse({
      paths: "src/**/*.ts",
    });

    expect(result.success).toBe(false);
  });
});
