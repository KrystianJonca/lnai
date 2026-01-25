import type { ToolId } from "../constants";
import type { Plugin } from "./types";

class PluginRegistry {
  private plugins: Map<ToolId, Plugin> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: ToolId): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getIds(): ToolId[] {
    return Array.from(this.plugins.keys());
  }

  has(id: ToolId): boolean {
    return this.plugins.has(id);
  }
}

export const pluginRegistry = new PluginRegistry();
