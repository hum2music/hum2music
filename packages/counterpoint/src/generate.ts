import type { NoteEvent } from "@hum2music/core";
import { classifyMotion, crossesVoices, hasForbiddenParallelPerfect, isConsonant, isPerfectConsonance } from "./intervals.js";

export interface CounterpointOptions {
  range: { min: number; max: number };
  /** Whether the generated voice sits above the cantus firmus (controls which side counts as "crossed"). */
  above: boolean;
  velocity?: number;
}

const DEFAULT_VELOCITY = 75;
/** Degenerate fallback interval (a perfect 5th) used only when every pitch in `range` is ruled out by the hard constraints — see generateCounterpointVoice's doc comment. */
const FALLBACK_INTERVAL_SEMITONES = 7;

/**
 * Generates a single additional voice, one note per cantus-firmus note
 * (first species / note-against-note), choosing — at each step, from every
 * pitch in `range` that doesn't cross voices or create a forbidden
 * parallel perfect 5th/octave with the previous pair — whichever is most
 * consonant, approached by the most contrary motion, and the smallest
 * melodic leap from the previous note (PRD UPDATE_PRD.md §8.3).
 *
 * Deterministic: ties are broken by scanning `range` from `range.min`
 * upward, so the same cantus firmus and options always produce the same
 * voice (PRD §15.1). If no candidate in `range` survives the hard
 * constraints (can happen with a very narrow range), falls back to a
 * fixed interval from the cantus firmus rather than throwing — this
 * fallback note is not guaranteed to honor the voice-crossing/parallel-
 * motion rules.
 */
export function generateCounterpointVoice(cantusFirmus: NoteEvent[], options: CounterpointOptions): NoteEvent[] {
  const { range, above } = options;
  const velocity = options.velocity ?? DEFAULT_VELOCITY;

  const result: NoteEvent[] = [];
  let previousPitch: number | null = null;

  cantusFirmus.forEach((cantusNote, index) => {
    const isFirst = index === 0;
    const isLast = index === cantusFirmus.length - 1;
    const previousCantusPitch = index > 0 ? cantusFirmus[index - 1].pitch : null;

    let bestPitch: number | null = null;
    let bestScore = -Infinity;

    for (let pitch = range.min; pitch <= range.max; pitch++) {
      if (crossesVoices(cantusNote.pitch, pitch, above)) continue;
      if (previousPitch !== null && previousCantusPitch !== null) {
        if (hasForbiddenParallelPerfect(previousCantusPitch, cantusNote.pitch, previousPitch, pitch)) continue;
      }

      const score = scoreCandidate(cantusNote.pitch, pitch, {
        isFirst,
        isLast,
        previousPitch,
        previousCantusPitch,
      });
      if (score > bestScore) {
        bestScore = score;
        bestPitch = pitch;
      }
    }

    const chosenPitch = bestPitch ?? fallbackPitch(cantusNote.pitch, range, above);
    result.push({ pitch: chosenPitch, startBeat: cantusNote.startBeat, durationBeats: cantusNote.durationBeats, velocity });
    previousPitch = chosenPitch;
  });

  return result;
}

function scoreCandidate(
  cantusPitch: number,
  candidatePitch: number,
  context: { isFirst: boolean; isLast: boolean; previousPitch: number | null; previousCantusPitch: number | null },
): number {
  let score = 0;
  if (isConsonant(cantusPitch, candidatePitch)) score += 10;
  if ((context.isFirst || context.isLast) && isPerfectConsonance(cantusPitch, candidatePitch)) score += 5;

  if (context.previousPitch !== null && context.previousCantusPitch !== null) {
    const motion = classifyMotion(context.previousCantusPitch, cantusPitch, context.previousPitch, candidatePitch);
    score += motion === "contrary" ? 3 : motion === "oblique" ? 2 : motion === "similar" ? 1 : 0;
    score -= Math.abs(candidatePitch - context.previousPitch) * 0.1;
  }

  return score;
}

function fallbackPitch(cantusPitch: number, range: { min: number; max: number }, above: boolean): number {
  const offset = above ? FALLBACK_INTERVAL_SEMITONES : -FALLBACK_INTERVAL_SEMITONES;
  return Math.min(range.max, Math.max(range.min, cantusPitch + offset));
}
