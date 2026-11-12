import type { InstrumentArranger } from "./arranger";
import type { ComposerPlugin, ExpressionPlugin } from "./composer";
import type { InstrumentDefinition } from "./instrument";
import type { Registry } from "./registry";
import type { AudioRenderer } from "./renderer";
import type { StyleDefinition } from "./style";

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
