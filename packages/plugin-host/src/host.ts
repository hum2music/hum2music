import type {
  AudioRenderer,
  ComposerPlugin,
  ExpressionPlugin,
  Hum2MusicPlugin,
  InstrumentArranger,
  InstrumentDefinition,
  PluginContext,
  StyleDefinition,
} from "@hum2music/plugin-api";
import { RegistryImpl } from "./registry.ts";
import { isApiVersionCompatible } from "./semver.ts";

/** The Plugin API version this host implements. Bump the major segment on breaking changes (PRD UPDATE_PRD.md §13.4). */
export const HOST_API_VERSION = "1.0.0";

export interface PluginRecord {
  id: string;
  version: string;
  apiVersion: string;
}

/**
 * Owns the registries and the discover -> validate -> resolve dependencies
 * -> register -> initialize lifecycle (PRD UPDATE_PRD.md §4.3). Registry
 * mutation is rejected while a composition is in flight, approximating
 * "Registry is frozen for the duration of one compose() call" (§4.4).
 */
export class PluginHost {
  private readonly plugins = new Map<string, Hum2MusicPlugin>();
  private locked = false;

  private readonly context: PluginContext = {
    instruments: new RegistryImpl<InstrumentDefinition>(),
    styles: new RegistryImpl<StyleDefinition>(),
    arrangers: new RegistryImpl<InstrumentArranger>(),
    renderers: new RegistryImpl<AudioRenderer>(),
    composers: new RegistryImpl<ComposerPlugin>(),
    expressions: new RegistryImpl<ExpressionPlugin>(),
  };

  async use(plugin: Hum2MusicPlugin): Promise<void> {
    if (this.locked) {
      throw new Error("Cannot register a plugin while a composition is in progress.");
    }
    this.validate(plugin);
    await plugin.register(this.context);
    this.plugins.set(plugin.id, plugin);
  }

  private validate(plugin: Hum2MusicPlugin): void {
    if (!plugin.id) {
      throw new Error("Plugin is missing an id.");
    }
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }
    if (!isApiVersionCompatible(plugin.apiVersion, HOST_API_VERSION)) {
      throw new Error(
        `Plugin "${plugin.id}" targets Plugin API ${plugin.apiVersion}, incompatible with host version ${HOST_API_VERSION}.`,
      );
    }
    if (plugin.dependencies?.includes(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" declares a dependency on itself.`);
    }
    const missing = (plugin.dependencies ?? []).filter((id) => !this.plugins.has(id));
    if (missing.length > 0) {
      throw new Error(`Plugin "${plugin.id}" depends on unregistered plugin(s): ${missing.join(", ")}.`);
    }
  }

  getContext(): PluginContext {
    return this.context;
  }

  list(): PluginRecord[] {
    return [...this.plugins.values()].map(({ id, version, apiVersion }) => ({ id, version, apiVersion }));
  }

  /** Runs `fn` with the registry locked against further `use()` calls, per §4.4's "no plugin add/remove during execution" rule. */
  async withRegistryLocked<T>(fn: () => Promise<T>): Promise<T> {
    if (this.locked) return fn();
    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
    }
  }

  async dispose(): Promise<void> {
    for (const plugin of [...this.plugins.values()].reverse()) {
      await plugin.dispose?.();
    }
    this.plugins.clear();
  }
}
