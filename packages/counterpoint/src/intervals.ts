/**
 * Interval/motion classification for first-species (note-against-note)
 * counterpoint (PRD UPDATE_PRD.md §8.3). Interval quality only depends on
 * the pitch-class distance between the two voices (compound intervals
 * reduce to their simple equivalent), which is standard for species-
 * counterpoint rule-checking.
 */

/** Perfect consonances (unison/octave, perfect 5th) — the only ones a parallel-motion rule applies to. */
const PERFECT_CONSONANT_CLASSES = new Set([0, 7]);
/** Perfect + imperfect consonances (unison/octave, 3rds, 5th, 6ths). A perfect 4th is treated as dissonant, the standard convention for strict 2-voice counterpoint. */
const CONSONANT_CLASSES = new Set([0, 3, 4, 7, 8, 9]);

function intervalClass(pitchA: number, pitchB: number): number {
  return Math.abs(pitchA - pitchB) % 12;
}

export function isConsonant(pitchA: number, pitchB: number): boolean {
  return CONSONANT_CLASSES.has(intervalClass(pitchA, pitchB));
}

export function isPerfectConsonance(pitchA: number, pitchB: number): boolean {
  return PERFECT_CONSONANT_CLASSES.has(intervalClass(pitchA, pitchB));
}

export type Motion = "contrary" | "oblique" | "similar" | "parallel";

/**
 * Classifies the motion between two voices from one note-pair to the next.
 * "Oblique" = one voice holds its pitch. "Parallel" = both voices move the
 * same direction by the same number of semitones. "Similar" = both move
 * the same direction by a different amount. "Contrary" = opposite
 * directions.
 */
export function classifyMotion(
  previousVoiceA: number,
  currentVoiceA: number,
  previousVoiceB: number,
  currentVoiceB: number,
): Motion {
  const deltaA = currentVoiceA - previousVoiceA;
  const deltaB = currentVoiceB - previousVoiceB;

  if (deltaA === 0 || deltaB === 0) return "oblique";
  if (Math.sign(deltaA) !== Math.sign(deltaB)) return "contrary";
  return Math.abs(deltaA) === Math.abs(deltaB) ? "parallel" : "similar";
}

/**
 * The classic forbidden case: consecutive perfect consonances (5th or
 * octave/unison) reached by similar or parallel motion ("parallel fifths/
 * octaves"). Contrary or oblique motion into a perfect consonance is fine.
 */
export function hasForbiddenParallelPerfect(
  previousVoiceA: number,
  currentVoiceA: number,
  previousVoiceB: number,
  currentVoiceB: number,
): boolean {
  if (!isPerfectConsonance(previousVoiceA, previousVoiceB) || !isPerfectConsonance(currentVoiceA, currentVoiceB)) {
    return false;
  }
  const motion = classifyMotion(previousVoiceA, currentVoiceA, previousVoiceB, currentVoiceB);
  return motion === "parallel" || motion === "similar";
}

/** Whether the counterpoint voice has crossed to the wrong side of the cantus firmus (PRD §8.3's "声部交差の制御"). */
export function crossesVoices(cantusPitch: number, counterpointPitch: number, counterpointAbove: boolean): boolean {
  return counterpointAbove ? counterpointPitch < cantusPitch : counterpointPitch > cantusPitch;
}
