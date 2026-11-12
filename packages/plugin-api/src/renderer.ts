import type { PluginComposition } from "./composition.ts";

/**
 * Runtime-independent audio buffer: plain sample arrays rather than a
 * browser AudioBuffer, so renderers run the same in Bun/Node and the
 * browser (PRD UPDATE_PRD.md §6.2).
 */
export interface AudioBufferData {
  sampleRate: number;
  channels: number;
  /** One Float32Array of samples per channel. */
  samples: Float32Array[];
}

export interface RenderOptions {
  sampleRate?: number;
  seed?: number;
  /** Instrument ID -> renderer-specific preset/patch name (e.g. @hum2music/renderer-soundfont reads this as a GM program number string). */
  instrumentPresets?: Record<string, string>;
  channels?: number;
  /** An in-memory SoundFont2 (.sf2) file, for renderers that play back real sample data instead of synthesizing (e.g. @hum2music/renderer-soundfont). Ignored by renderers that don't need it. */
  soundFontData?: ArrayBuffer;
}

/** Separates the instrument's playable definition from how it's actually synthesized (PRD UPDATE_PRD.md §6, ADR-002). */
export interface AudioRenderer {
  id: string;
  render(composition: PluginComposition, options: RenderOptions): Promise<AudioBufferData>;
}
