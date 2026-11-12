import type { InstrumentDefinition } from "@hum2music/plugin-api";

export type OrchestrationRole = "melody" | "bass" | "harmony" | "countermelody";

export interface OrchestrationAssignment {
  instrumentId: string;
  role: OrchestrationRole;
}

/**
 * Decides which role each instrument in an ensemble plays (PRD
 * UPDATE_PRD.md §8.5 — register, instrument character, melody
 * handoff/countermelody, playable range). Deliberately *decides roles
 * only*; generating the actual notes for a role (chord voicing for
 * "harmony", a countersubject for "countermelody", ...) stays the job of
 * each instrument's own Arranger/the Counterpoint Engine, matching the
 * existing separation between composition decisions and note generation.
 *
 * Rules, in order:
 * 1. "melody" goes to whichever instrument's pitchRange covers the most
 *    of the melody's own register (non-pitched instruments, e.g. drums,
 *    are never eligible) — preferring a monophonic (melody-idiomatic)
 *    instrument over a polyphonic one (e.g. piano) when one adequately
 *    covers the register, rather than always handing melody to whichever
 *    instrument happens to have the widest range.
 * 2. "bass" goes to whichever remaining instrument has the lowest range.
 * 3. Any other instrument capable of polyphony (polyphony > 1, e.g.
 *    piano) gets "harmony"; everything else gets "countermelody".
 */
export function assignRoles(
  instruments: InstrumentDefinition[],
  melodyRange: { min: number; max: number },
): OrchestrationAssignment[] {
  if (instruments.length === 0) return [];

  const melodyInstrument = pickMelodyInstrument(instruments, melodyRange);
  const remaining = instruments.filter((instrument) => instrument !== melodyInstrument);
  const bassInstrument = remaining.length > 0 ? pickLowestRegister(remaining) : undefined;

  const assignments: OrchestrationAssignment[] = [{ instrumentId: melodyInstrument.id, role: "melody" }];
  if (bassInstrument) assignments.push({ instrumentId: bassInstrument.id, role: "bass" });

  for (const instrument of remaining) {
    if (instrument === bassInstrument) continue;
    assignments.push({ instrumentId: instrument.id, role: instrument.polyphony > 1 ? "harmony" : "countermelody" });
  }

  return assignments;
}

/** A monophonic instrument covering at least this fraction of the melody's register is considered "idiomatically suited" to play it, ahead of a polyphonic instrument (piano) that technically covers it too. */
const MELODY_FIT_THRESHOLD = 0.8;

function pickMelodyInstrument(
  instruments: InstrumentDefinition[],
  melodyRange: { min: number; max: number },
): InstrumentDefinition {
  const pitchedInstruments = instruments.filter((instrument) => instrument.pitchRange);
  const candidates = pitchedInstruments.length > 0 ? pitchedInstruments : instruments;

  // Prefer a monophonic (melody-idiomatic) instrument when one adequately
  // covers the register, rather than always handing melody to whichever
  // instrument has the widest range (typically the piano).
  const monophonicCandidates = candidates.filter((instrument) => instrument.polyphony === 1);
  const pool =
    monophonicCandidates.some((instrument) => registerFitScore(instrument, melodyRange) >= MELODY_FIT_THRESHOLD)
      ? monophonicCandidates
      : candidates;

  return pool.reduce((best, candidate) =>
    registerFitScore(candidate, melodyRange) > registerFitScore(best, melodyRange) ? candidate : best,
  );
}

/** Fraction of the melody's own pitch span that falls inside the instrument's range (0 = no overlap, 1 = full coverage). */
function registerFitScore(instrument: InstrumentDefinition, melodyRange: { min: number; max: number }): number {
  if (!instrument.pitchRange) return -Infinity;

  const overlapMin = Math.max(instrument.pitchRange.min, melodyRange.min);
  const overlapMax = Math.min(instrument.pitchRange.max, melodyRange.max);
  const overlap = Math.max(0, overlapMax - overlapMin);
  const melodySpan = Math.max(1, melodyRange.max - melodyRange.min);

  return overlap / melodySpan;
}

function pickLowestRegister(instruments: InstrumentDefinition[]): InstrumentDefinition {
  // A monophonic instrument (e.g. cello) is a more idiomatic single bass
  // line than a polyphonic one (e.g. piano) that merely happens to also
  // reach low notes — a polyphonic instrument is better used for "harmony",
  // which can include its own low notes as part of its voicings anyway.
  const monophonic = instruments.filter((instrument) => instrument.polyphony === 1 && instrument.pitchRange);
  const pool = monophonic.length > 0 ? monophonic : instruments;

  return pool.reduce((lowest, candidate) => {
    const lowestMin = lowest.pitchRange?.min ?? Number.POSITIVE_INFINITY;
    const candidateMin = candidate.pitchRange?.min ?? Number.POSITIVE_INFINITY;
    return candidateMin < lowestMin ? candidate : lowest;
  });
}
