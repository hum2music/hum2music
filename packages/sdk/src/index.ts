import type { AudioBufferData, Hum2MusicPlugin, PluginComposition, RenderOptions } from "@hum2music/plugin-api";
import { PluginHost, type PluginRecord } from "@hum2music/plugin-host";
import { compose, type ComposeOptions } from "./compose";
import { renderComposition } from "./render";

export type { ComposeOptions } from "./compose";

export interface Hum2MusicApp {
  use(plugin: Hum2MusicPlugin): Promise<void>;
  listPlugins(): PluginRecord[];
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
    compose: (options) => host.withRegistryLocked(() => compose(host.getContext(), options)),
    render: (composition, rendererId, options) => renderComposition(host.getContext(), composition, rendererId, options),
    dispose: () => host.dispose(),
  };
}
