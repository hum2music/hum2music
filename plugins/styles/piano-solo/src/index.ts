import type { Hum2MusicPlugin } from "@hum2music/plugin-api";

/**
 * A genuine solo-piano texture: the melody (right hand) layered over an
 * arpeggiated chord voicing with extensions (left hand), both within the
 * piano's own track, instead of the piano playing chords-only
 * accompaniment to a separate melody instrument. Addresses PRD
 * UPDATE_PRD.md §8.4's "ピアノ独奏曲を生成できる" directly.
 */
export const pianoSoloStylePlugin: Hum2MusicPlugin = {
  id: "@hum2music/style-piano-solo",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.styles.register({
      id: "piano-solo",
      name: "Piano Solo",
      orchestration: { pianoPattern: "arpeggio", pianoAllowExtensions: true, pianoIncludeMelody: true },
      expression: { humanizeMultiplier: 0.6 },
      defaultInstruments: ["piano"],
    });
  },
};
