import { STYLE_PROFILES } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, StyleDefinition } from "@hum2music/plugin-api";

function toStyleDefinition(name: "pop" | "ballad", displayName: string): StyleDefinition {
  const profile = STYLE_PROFILES[name];
  return {
    id: name,
    name: displayName,
    harmony: { progressionWeights: profile.harmonyWeights },
    rhythm: { drumDensity: profile.drumDensity, guitarPattern: profile.guitarPattern },
    orchestration: {
      pianoPattern: profile.pianoPattern,
      pianoAllowExtensions: profile.pianoAllowExtensions,
      programNumbers: profile.programNumbers,
    },
    expression: { humanizeMultiplier: profile.humanizeMultiplier },
    defaultInstruments: ["piano", "bass", "drums", "guitar"],
  };
}

/**
 * Compatibility wrapper registering the existing (pre-plugin-system) Pop
 * and Ballad style profiles from @hum2music/arrangement as StyleDefinitions,
 * per UPDATE_PRD.md §7.3 "既存実装との互換性を維持する". The underlying
 * chord-progression weights, piano/guitar pattern choice, and drum density
 * are reused as-is, not reimplemented.
 */
export const popBalladStylePlugin: Hum2MusicPlugin = {
  id: "@hum2music/style-pop-ballad",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.styles.register(toStyleDefinition("pop", "Pop"));
    context.styles.register(toStyleDefinition("ballad", "Ballad"));
  },
};
