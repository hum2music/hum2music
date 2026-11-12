import type {
  AudioBufferData,
  AudioRenderer,
  Hum2MusicPlugin,
  InstrumentDefinition,
  PluginComposition,
  RenderOptions,
  StyleDefinition,
} from "@hum2music/plugin-api";
import { PluginHost, type PluginRecord } from "@hum2music/plugin-host";
import { compose, type ComposeOptions } from "./compose";
import { renderComposition } from "./render";

export type { ComposeOptions } from "./compose";
export { defineConfig, type Hum2MusicConfig } from "./config";

export interface Hum2MusicApp {
  use(plugin: Hum2MusicPlugin): Promise<void>;
  listPlugins(): PluginRecord[];
  /** Looks up a registered style, e.g. to read its harmony.progressionWeights ahead of a separate chord-search step that runs upstream of compose(). */
  getStyle(id: string): StyleDefinition | undefined;
  /** Reads back what's registered, e.g. so a CLI/Web UI can display available instruments/styles/renderers (PRD UPDATE_PRD.md §11.2) without reaching into the host directly. */
  listInstruments(): InstrumentDefinition[];
  listStyles(): StyleDefinition[];
  listRenderers(): AudioRenderer[];
  compose(options: ComposeOptions): Promise<PluginComposition>;
  render(composition: PluginComposition, rendererId: string, options?: RenderOptions): Promise<AudioBufferData>;
  dispose(): Promise<void>;
}

/**
 * Developer-facing entry point (PRD UPDATE_PRD.md §10.1):
 *
 * ```ts
 * const app = createHum2Music();
 * await app.use(pianoInstrumentPlugin);
 * await app.use(builtinSynthRendererPlugin);
 * const composition = await app.compose({ melody, chords, bpm, instruments: ["piano"] });
 * const audio = await app.render(composition, "builtin-synth");
 * ```
 */
export function createHum2Music(): Hum2MusicApp {
  const host = new PluginHost();

  return {
    use: (plugin) => host.use(plugin),
    listPlugins: () => host.list(),
    getStyle: (id) => host.getContext().styles.get(id),
    listInstruments: () => host.getContext().instruments.list(),
    listStyles: () => host.getContext().styles.list(),
    listRenderers: () => host.getContext().renderers.list(),
    compose: (options) => host.withRegistryLocked(() => compose(host.getContext(), options)),
    render: (composition, rendererId, options) => renderComposition(host.getContext(), composition, rendererId, options),
    dispose: () => host.dispose(),
  };
}
