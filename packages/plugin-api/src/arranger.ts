import type { ChordEvent, KeyCandidate, NoteEvent, SongSection } from "@hum2music/core";
import type { InstrumentDefinition } from "./instrument.ts";
import type { StyleDefinition } from "./style.ts";

/**
 * Everything an Arranger Plugin can read while generating notes for its
 * instrument (PRD UPDATE_PRD.md §5.4): the melody, harmony, song structure,
 * its own instrument's playable constraints, and the tracks already
 * composed earlier in the same compose() call.
 */
export interface ArrangementContext {
  melody: NoteEvent[];
  chords: ChordEvent[];
  key?: KeyCandidate;
  bpm: number;
  sections: SongSection[];
  instrument: InstrumentDefinition;
  style?: StyleDefinition;
  /** Tracks already produced earlier in this compose() call, keyed by instrument ID. */
  otherTracks: ReadonlyMap<string, NoteEvent[]>;
  seed: number;
}

/** Common contract so each instrument's note-generation logic is independently swappable (PRD UPDATE_PRD.md §5.4, §9.1). */
export interface InstrumentArranger {
  id: string;
  instrumentId: string;
  arrange(context: ArrangementContext): Promise<NoteEvent[]>;
}
