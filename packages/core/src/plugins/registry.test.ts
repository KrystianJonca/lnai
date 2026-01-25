import { describe, expect, it } from "vitest";

import type { ToolId } from "../constants";
import type { Plugin } from "./types";

// Create a fresh registry for testing instead of using the global one
// This avoids interference with other tests
class TestPluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }
}

function createMockPlugin(id: string, name: string): Plugin {
  return {
    id: id as ToolId,
    name,
    detect: async () => false,
    import: async () => null,
    export: async () => [],
    validate: () => ({
      valid: true,
      errors: [],
      warnings: [],
      skipped: [],
    }),
  };
}

describe("PluginRegistry", () => {
  it("registers a plugin", () => {
    const registry = new TestPluginRegistry();
    const plugin = createMockPlugin("claudeCode", "Claude Code");

    registry.register(plugin);

    expect(registry.has("claudeCode")).toBe(true);
  });

  it("gets a registered plugin", () => {
    const registry = new TestPluginRegistry();
    const plugin = createMockPlugin("claudeCode", "Claude Code");

    registry.register(plugin);

    const retrieved = registry.get("claudeCode");

    expect(retrieved).toBe(plugin);
    expect(retrieved?.name).toBe("Claude Code");
  });

  it("returns undefined for missing plugin", () => {
    const registry = new TestPluginRegistry();

    const result = registry.get("nonexistent");

    expect(result).toBeUndefined();
  });

  it("gets all registered plugins", () => {
    const registry = new TestPluginRegistry();
    const plugin1 = createMockPlugin("claudeCode", "Claude Code");
    const plugin2 = createMockPlugin("opencode", "OpenCode");

    registry.register(plugin1);
    registry.register(plugin2);

    const all = registry.getAll();

    expect(all).toHaveLength(2);
    expect(all).toContain(plugin1);
    expect(all).toContain(plugin2);
  });

  it("gets all plugin IDs", () => {
    const registry = new TestPluginRegistry();
    registry.register(createMockPlugin("claudeCode", "Claude Code"));
    registry.register(createMockPlugin("opencode", "OpenCode"));

    const ids = registry.getIds();

    expect(ids).toHaveLength(2);
    expect(ids).toContain("claudeCode");
    expect(ids).toContain("opencode");
  });

  it("returns true for registered plugin", () => {
    const registry = new TestPluginRegistry();
    registry.register(createMockPlugin("claudeCode", "Claude Code"));

    expect(registry.has("claudeCode")).toBe(true);
  });

  it("returns false for missing plugin", () => {
    const registry = new TestPluginRegistry();

    expect(registry.has("nonexistent")).toBe(false);
  });

  it("overwrites existing plugin with same id", () => {
    const registry = new TestPluginRegistry();
    const plugin1 = createMockPlugin("claudeCode", "Old Name");
    const plugin2 = createMockPlugin("claudeCode", "New Name");

    registry.register(plugin1);
    registry.register(plugin2);

    const retrieved = registry.get("claudeCode");

    expect(retrieved?.name).toBe("New Name");
    expect(registry.getAll()).toHaveLength(1);
  });
});
