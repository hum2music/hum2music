import { pitchClassOf } from "@hum2music/music-theory";

/** Pitch classes ordered by stacking perfect fifths from C, for circle-of-fifths distance. */
const CIRCLE_OF_FIFTHS_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const FIFTHS_POSITION = new Map(CIRCLE_OF_FIFTHS_ORDER.map((pitchClass, position) => [pitchClass, position]));

/**
 * Scores how "natural" a chord-root transition is: root motion by a fifth
 * (dominant/subdominant motion) scores highest, a tritone-apart move lowest.
 * A simplified stand-in for a full functional-harmony transition table
 * (PRD §8.3's H term).
 */
export function harmonicNaturalnessScore(prevRoot: number, curRoot: number): number {
  const prevPosition = FIFTHS_POSITION.get(pitchClassOf(prevRoot))!;
  const curPosition = FIFTHS_POSITION.get(pitchClassOf(curRoot))!;
  const rawDistance = Math.abs(prevPosition - curPosition) % 12;
  const fifthsDistance = Math.min(rawDistance, 12 - rawDistance);
  return 1 - fifthsDistance / 6;
}
