import type { InstrumentArranger } from "./arranger.js";
import type { ComposerPlugin, ExpressionPlugin } from "./composer.js";
import type { InstrumentDefinition } from "./instrument.js";
import type { Registry } from "./registry.js";
import type { AudioRenderer } from "./renderer.js";
import type { StyleDefinition } from "./style.js";

/** The registries a plugin's register() populates (PRD UPDATE_PRD.md §4.2). */
export interface PluginContext {
  instruments: Registry<InstrumentDefinition>;
  styles: Registry<StyleDefinition>;
  arrangers: Registry<InstrumentArranger>;
  renderers: Registry<AudioRenderer>;
  composers: Registry<ComposerPlugin>;
  expressions: Registry<ExpressionPlugin>;
}

/**
 * Common shape for every plugin kind (instrument, style, renderer,
 * composer, expression — PRD UPDATE_PRD.md §4.1). `id` must be namespaced
 * and unique (e.g. "@hum2music/instrument-violin").
 */
export interface Hum2MusicPlugin {
  id: string;
  version: string;
  /** The Plugin API version this plugin was written against, checked against @hum2music/plugin-host's supported range. */
  apiVersion: string;
  /** Plugin IDs that must already be registered before this one. */
  dependencies?: string[];

  register(context: PluginContext): void | Promise<void>;
  dispose?(): void | Promise<void>;
}
