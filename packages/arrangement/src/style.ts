import type { ProgressionSearchWeights } from "@hum2music/harmony";

export type StyleName = "pop" | "ballad";
export const STYLE_NAMES: StyleName[] = ["pop", "ballad"];

export interface StyleProfile {
  name: StyleName;
  /** Passed through to searchChordProgression; style-dependent weighting stands in for the S term (PRD §8.3). */
  harmonyWeights: ProgressionSearchWeights;
  pianoPattern: "block" | "arpeggio";
  /** Whether the piano voicing may add the 9th as an extra available tone, beyond the chord's own tones. */
  pianoAllowExtensions: boolean;
  guitarPattern: "strum" | "arpeggio";
  drumDensity: "normal" | "sparse";
  humanizeMultiplier: number;
  programNumbers: { piano: number; bass: number; guitar: number };
}

/**
 * A style is a weighting/parameter profile layered on top of the existing
 * engines, not a new generation algorithm, to keep everything deterministic
 * (PRD §15.1) and the engines swappable (docs/specs/style-profiles.md).
 * Proposed values below are unvalidated starting points.
 */
export const STYLE_PROFILES: Record<StyleName, StyleProfile> = {
  pop: {
    name: "pop",
    harmonyWeights: { melodyFit: 0.5, harmonicNaturalness: 0.3, voiceLeading: 0.2 },
    pianoPattern: "block",
    pianoAllowExtensions: false,
    guitarPattern: "strum",
    drumDensity: "normal",
    humanizeMultiplier: 1,
    programNumbers: { piano: 0, bass: 33, guitar: 29 },
  },
  ballad: {
    name: "ballad",
    harmonyWeights: { melodyFit: 0.55, harmonicNaturalness: 0.25, voiceLeading: 0.2 },
    pianoPattern: "arpeggio",
    pianoAllowExtensions: true,
    guitarPattern: "arpeggio",
    drumDensity: "sparse",
    humanizeMultiplier: 0.7,
    programNumbers: { piano: 0, bass: 32, guitar: 24 },
  },
};

export function resolveStyleProfile(name: string | undefined): StyleProfile {
  if (name && isStyleName(name)) return STYLE_PROFILES[name];
  return STYLE_PROFILES.pop;
}

function isStyleName(name: string): name is StyleName {
  return (STYLE_NAMES as string[]).includes(name);
}
