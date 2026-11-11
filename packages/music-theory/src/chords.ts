import { NOTE_NAMES, pitchClassOf } from "./pitch-class";

export type ChordQuality = "major" | "minor" | "dominant7" | "major7" | "minor7" | "sus2" | "sus4";

export const CHORD_QUALITIES: ChordQuality[] = [
  "major",
  "minor",
  "dominant7",
  "major7",
  "minor7",
  "sus2",
  "sus4",
];

/** Semitone offsets from the root, per PRD §8.2's initial chord-type set. */
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: "",
  minor: "m",
  dominant7: "7",
  major7: "maj7",
  minor7: "m7",
  sus2: "sus2",
  sus4: "sus4",
};

export function chordPitchClasses(root: number, quality: ChordQuality): number[] {
  const rootPitchClass = pitchClassOf(root);
  return CHORD_INTERVALS[quality].map((interval) => pitchClassOf(rootPitchClass + interval));
}

export function chordSymbol(root: number, quality: ChordQuality): string {
  return `${NOTE_NAMES[pitchClassOf(root)]}${QUALITY_SUFFIX[quality]}`;
}

const PITCH_CLASS_BY_NOTE_NAME: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const QUALITY_BY_SUFFIX: Record<string, ChordQuality> = Object.fromEntries(
  CHORD_QUALITIES.map((quality) => [QUALITY_SUFFIX[quality], quality]),
);

/** Inverse of chordSymbol; returns null for a symbol this chord-type set can't represent (e.g. an unsupported suffix). */
export function parseChordSymbol(symbol: string): { root: number; quality: ChordQuality } | null {
  const match = symbol.trim().match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;

  const [, rootName, suffix] = match;
  const root = PITCH_CLASS_BY_NOTE_NAME[rootName];
  const quality = QUALITY_BY_SUFFIX[suffix];
  if (root === undefined || quality === undefined) return null;

  return { root, quality };
}
