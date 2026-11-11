import type { KeyCandidate } from "@hum2music/core";
import { KEY_PROFILES, NOTE_NAMES, pitchClassOf, type ScaleMode } from "@hum2music/music-theory";
import type { TimedNote } from "./timed-note";

/**
 * Correlates a duration-weighted pitch-class histogram against all 24
 * Krumhansl-Kessler key profiles (12 tonics x major/minor) and returns the
 * best-matching keys, ranked, rather than committing to a single guess
 * (PRD §8.1).
 */
export function estimateKey(notes: TimedNote[], maxCandidates = 5): KeyCandidate[] {
  const histogram = buildPitchClassHistogram(notes);

  const candidates: KeyCandidate[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ["major", "minor"] as ScaleMode[]) {
      const rotatedProfile = rotateProfileToTonic(KEY_PROFILES[mode], tonic);
      const correlation = pearsonCorrelation(histogram, rotatedProfile);
      candidates.push({ tonic: NOTE_NAMES[tonic], mode, confidence: clamp01((correlation + 1) / 2) });
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates.slice(0, maxCandidates);
}

function buildPitchClassHistogram(notes: TimedNote[]): number[] {
  const histogram = new Array(12).fill(0);
  for (const note of notes) histogram[pitchClassOf(note.pitch)] += note.durationMs;
  const total = histogram.reduce((sum, value) => sum + value, 0);
  return total === 0 ? histogram : histogram.map((value) => value / total);
}

/** `profile[i]` is defined relative to the tonic; this aligns it to absolute pitch classes. */
function rotateProfileToTonic(profile: number[], tonic: number): number[] {
  return Array.from({ length: 12 }, (_, pitchClass) => profile[(((pitchClass - tonic) % 12) + 12) % 12]);
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < n; i++) {
    const deviationA = a[i] - meanA;
    const deviationB = b[i] - meanB;
    numerator += deviationA * deviationB;
    varianceA += deviationA * deviationA;
    varianceB += deviationB * deviationB;
  }

  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator === 0 ? 0 : numerator / denominator;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
