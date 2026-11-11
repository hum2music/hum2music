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
