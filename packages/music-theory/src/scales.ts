import { pitchClassOf } from "./pitch-class";

export type ScaleMode = "major" | "minor";

/** Natural major and natural minor, per PRD §8.1 ("MVPでは長調・短調を中心とする"). */
export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export function scalePitchClasses(tonic: number, mode: ScaleMode): Set<number> {
  const tonicPitchClass = pitchClassOf(tonic);
  return new Set(SCALE_INTERVALS[mode].map((interval) => pitchClassOf(tonicPitchClass + interval)));
}

export function isDiatonic(pitchClass: number, tonic: number, mode: ScaleMode): boolean {
  return scalePitchClasses(tonic, mode).has(pitchClassOf(pitchClass));
}
