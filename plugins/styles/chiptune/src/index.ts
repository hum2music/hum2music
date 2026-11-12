import type { Hum2MusicPlugin } from "@hum2music/plugin-api";

/**
 * A mechanically precise, melody-led style using the existing built-in
 * synth rather than a dedicated chip-emulation renderer (PRD UPDATE_PRD.md
 * §7.3's "既存の簡易シンセを活用し、意図的にレトロなゲーム音楽を作成する").
 * `humanizeMultiplier: 0` keeps timing/velocity perfectly on-grid (old
 * sound-chip hardware had no expressive timing); the arpeggiated piano
 * pattern echoes how early chip music simulated chords by cycling through
 * their notes quickly on a single channel. Program numbers lean on GM's
 * synth lead/bass patches as the closest general-purpose approximation of
 * a chiptune voice, since there's no SoundFont/chip-emulation renderer yet.
 */
export const chiptuneStylePlugin: Hum2MusicPlugin = {
  id: "@hum2music/style-chiptune",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.styles.register({
      id: "chiptune",
      name: "Chiptune",
      harmony: { progressionWeights: { melodyFit: 0.7, harmonicNaturalness: 0.2, voiceLeading: 0.1 } },
      rhythm: { drumDensity: "normal" },
      orchestration: {
        pianoPattern: "arpeggio",
        pianoAllowExtensions: false,
        programNumbers: { piano: 80, bass: 38 }, // GM Lead 1 (square), Synth Bass 1
      },
      expression: { humanizeMultiplier: 0 },
      defaultInstruments: ["piano", "bass", "drums"],
    });
  },
};
