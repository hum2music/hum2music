import type { TempoCandidate } from "@hum2music/core";
import type { TimedNote } from "./timed-note";

export interface TempoEstimationOptions {
  minIntervalMs?: number;
  maxIntervalMs?: number;
  maxCandidates?: number;
}

/**
 * Builds a histogram of inter-onset intervals (read as implied quarter-note
 * BPM) and returns the most frequent values as ranked candidates. Half/double
 * tempo relationships are flagged rather than collapsed, per PRD §7.1.
 */
export function estimateTempo(notes: TimedNote[], options: TempoEstimationOptions = {}): TempoCandidate[] {
  const minIntervalMs = options.minIntervalMs ?? 100;
  const maxIntervalMs = options.maxIntervalMs ?? 2000;
  const maxCandidates = options.maxCandidates ?? 5;

  const onsets = notes.map((note) => note.startMs).sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i] - onsets[i - 1];
    if (interval >= minIntervalMs && interval <= maxIntervalMs) intervals.push(interval);
  }
  if (intervals.length === 0) return [];

  const bpmCounts = new Map<number, number>();
  for (const interval of intervals) {
    const bpm = Math.round(60000 / interval);
    bpmCounts.set(bpm, (bpmCounts.get(bpm) ?? 0) + 1);
  }

  const total = intervals.length;
  const candidates: TempoCandidate[] = [];
  for (const [bpm, count] of [...bpmCounts.entries()].sort((a, b) => b[1] - a[1])) {
    if (candidates.some((candidate) => isCloseBpm(candidate.bpm, bpm, 4))) continue;
    candidates.push({ bpm, confidence: count / total });
    if (candidates.length >= maxCandidates) break;
  }

  linkHalfAndDoubleTempoCandidates(candidates);
  return candidates;
}

function isCloseBpm(a: number, b: number, toleranceBpm: number): boolean {
  return Math.abs(a - b) <= toleranceBpm;
}

function linkHalfAndDoubleTempoCandidates(candidates: TempoCandidate[]): void {
  for (const candidate of candidates) {
    const strongerRelated = candidates.find(
      (other) =>
        other !== candidate &&
        other.confidence >= candidate.confidence &&
        (isCloseBpm(other.bpm, candidate.bpm * 2, other.bpm * 0.05) ||
          isCloseBpm(other.bpm, candidate.bpm / 2, other.bpm * 0.05)),
    );
    if (strongerRelated) candidate.isHalfOrDoubleOf = strongerRelated.bpm;
  }
}
