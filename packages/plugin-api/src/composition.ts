import type { ChordEvent, NoteEvent, SongSection } from "@hum2music/core";

export const COMPOSITION_SCHEMA_VERSION = "0.1.0";

/** One instrument's generated notes within a PluginComposition. */
export interface CompositionTrack {
  instrumentId: string;
  notes: NoteEvent[];
}

/**
 * The plugin system's intermediate representation, produced by compose()
 * and consumed by an AudioRenderer or MIDI export. Reuses the existing
 * NoteEvent/ChordEvent/SongSection types from @hum2music/core rather than
 * introducing a parallel representation (PRD UPDATE_PRD.md §9.1, ADR-004).
 */
export interface PluginComposition {
  metadata: {
    schemaVersion: string;
    seed: number;
    bpm: number;
    key?: string;
  };
  tracks: CompositionTrack[];
  chords: ChordEvent[];
  sections: SongSection[];
}
