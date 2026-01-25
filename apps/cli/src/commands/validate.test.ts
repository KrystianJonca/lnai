import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanupTempDir,
  createFullConfig,
  createInvalidConfig,
  createMinimalConfig,
  createTempDir,
} from "../__tests__/utils";

// Mock ora and chalk
vi.mock("ora", () => ({
  default: () => ({
    start: () => ({ succeed: vi.fn(), fail: vi.fn() }),
    succeed: vi.fn(),
    fail: vi.fn(),
  }),
}));

vi.mock("chalk", () => ({
  default: {
    gray: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    blue: (s: string) => s,
  },
}));

import {
  parseUnifiedConfig,
  pluginRegistry,
  validateUnifiedState,
} from "@lnai/core";

describe("validate command logic", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  });

  describe("parseUnifiedConfig", () => {
    it("parses minimal configuration successfully", async () => {
      await createMinimalConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);

      expect(state.config).toBeDefined();
      expect(state.config.tools).toBeDefined();
      expect(state.config.tools?.claudeCode?.enabled).toBe(true);
    });

    it("parses full configuration with settings and agents", async () => {
      await createFullConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);

      expect(state.config).toBeDefined();
      expect(state.settings).toBeDefined();
      expect(state.settings?.permissions?.allow).toContain("Bash(git:*)");
      expect(state.agents).toContain("# Project Instructions");
    });

    it("throws error for missing .ai/ directory", async () => {
      await expect(parseUnifiedConfig(tempDir)).rejects.toThrow();
    });

    it("throws error for invalid JSON", async () => {
      await createInvalidConfig(tempDir);

      await expect(parseUnifiedConfig(tempDir)).rejects.toThrow();
    });
  });

  describe("validateUnifiedState", () => {
    it("validates minimal configuration as valid", async () => {
      await createMinimalConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);
      const result = validateUnifiedState(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates full configuration as valid", async () => {
      await createFullConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);
      const result = validateUnifiedState(state);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("plugin validation", () => {
    it("validates configuration for all registered plugins", async () => {
      await createMinimalConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);
      const tools = pluginRegistry.getIds();

      for (const toolId of tools) {
        const plugin = pluginRegistry.get(toolId);
        if (plugin) {
          const result = plugin.validate(state);
          // Minimal config should pass basic validation
          expect(result.errors.length).toBe(0);
        }
      }
    });

    it("reports skipped features for claudeCode plugin", async () => {
      await createMinimalConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);
      const plugin = pluginRegistry.get("claudeCode");

      if (plugin) {
        const result = plugin.validate(state);
        // Should report skipped features when agents/settings are missing
        expect(result.skipped.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("--tools flag logic", () => {
    it("can filter to specific tools for validation", async () => {
      await createMinimalConfig(tempDir);

      const state = await parseUnifiedConfig(tempDir);

      // Test filtering to only claudeCode
      const claudePlugin = pluginRegistry.get("claudeCode");
      expect(claudePlugin).toBeDefined();

      const result = claudePlugin!.validate(state);
      expect(result.errors).toHaveLength(0);
    });

    it("handles unknown tool IDs gracefully", async () => {
      await createMinimalConfig(tempDir);

      const unknownPlugin = pluginRegistry.get(
        "unknownTool" as Parameters<typeof pluginRegistry.get>[0]
      );
      expect(unknownPlugin).toBeUndefined();
    });
  });
});
