import type { ChordEvent, NoteEvent, SongSection } from "@hum2music/core";

/**
 * A Composer Plugin generates structure/notes beyond what a single
 * instrument's Arranger produces (e.g. motif development, counterpoint,
 * song form) — PRD UPDATE_PRD.md §8. Only the registration contract is
 * implemented in this slice; the Classical Composition Engine itself
 * (motif/counterpoint/form/orchestration) is future work (see
 * tasks/STATUS.md).
 */
export interface ComposerPlugin {
  id: string;
  compose(context: { melody: NoteEvent[]; chords: ChordEvent[]; sections: SongSection[]; seed: number }): Promise<{
    sections: SongSection[];
  }>;
}

/**
 * An Expression Plugin shapes performance nuance (timing/velocity/vibrato)
 * for a track, independent of which instrument or renderer is used. Only
 * the registration contract is implemented in this slice; built-in
 * humanization continues to run through @hum2music/expression directly
 * (see tasks/STATUS.md).
 */
export interface ExpressionPlugin {
  id: string;
  apply(notes: NoteEvent[], context: { seed: number; bpm: number }): Promise<NoteEvent[]>;
}
