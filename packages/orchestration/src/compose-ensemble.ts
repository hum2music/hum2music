import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { generateCounterpointVoice } from "@hum2music/counterpoint";
import type { InstrumentDefinition } from "@hum2music/plugin-api";
import { assignRoles, type OrchestrationAssignment } from "./assign.ts";

export interface EnsembleTrack extends OrchestrationAssignment {
  notes: NoteEvent[];
}

export interface ComposeEnsembleOptions {
  melody: NoteEvent[];
  chords: ChordEvent[];
  /**
   * Produces notes for an instrument assigned the "harmony" or "bass"
   * role — typically that instrument's own registered Arranger (e.g.
   * piano's chord voicing, cello's root-following bass line). Chordal
   * accompaniment is already solved per-instrument elsewhere in the
   * plugin system, so it's reused here via this callback rather than
   * reimplemented.
   */
  arrangeChordal: (instrumentId: string, chords: ChordEvent[]) => NoteEvent[] | Promise<NoteEvent[]>;
}

const DEFAULT_MELODY_RANGE = { min: 60, max: 60 };

/**
 * Realizes assignRoles()'s decisions into an actual ensemble arrangement
 * (PRD UPDATE_PRD.md §8.5): the melody instrument plays the input melody
 * unchanged; each countermelody instrument gets a real voice from the
 * Counterpoint Engine, placed above or below the melody depending on
 * which register it sits in; harmony/bass instruments delegate to
 * `arrangeChordal`.
 */
export async function composeEnsemble(
  instruments: InstrumentDefinition[],
  options: ComposeEnsembleOptions,
): Promise<EnsembleTrack[]> {
  const melodyRange = melodyPitchRange(options.melody);
  const assignments = assignRoles(instruments, melodyRange);
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));

  const tracks: EnsembleTrack[] = [];
  for (const assignment of assignments) {
    if (assignment.role === "melody") {
      tracks.push({ ...assignment, notes: options.melody });
      continue;
    }

    if (assignment.role === "countermelody") {
      const instrument = instrumentById.get(assignment.instrumentId);
      const range = instrument?.pitchRange ?? melodyRange;
      const above = midpoint(range) > midpoint(melodyRange);
      tracks.push({ ...assignment, notes: generateCounterpointVoice(options.melody, { range, above }) });
      continue;
    }

    // "harmony" or "bass"
    const notes = await options.arrangeChordal(assignment.instrumentId, options.chords);
    tracks.push({ ...assignment, notes });
  }

  return tracks;
}

function melodyPitchRange(melody: NoteEvent[]): { min: number; max: number } {
  if (melody.length === 0) return DEFAULT_MELODY_RANGE;
  const pitches = melody.map((note) => note.pitch);
  return { min: Math.min(...pitches), max: Math.max(...pitches) };
}

function midpoint(range: { min: number; max: number }): number {
  return (range.min + range.max) / 2;
}
