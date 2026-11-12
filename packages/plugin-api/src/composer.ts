import type { ChordEvent, NoteEvent, SongSection } from "@hum2music/core";

export interface ComposerContext {
  melody: NoteEvent[];
  chords: ChordEvent[];
  sections: SongSection[];
  seed: number;
}

export interface ComposerResult {
  notes: NoteEvent[];
  sections: SongSection[];
}

/**
 * A Composer Plugin generates a full composition (notes plus structure)
 * from the input melody, beyond what a single instrument's Arranger
 * produces (e.g. motif development, counterpoint, song form) — PRD
 * UPDATE_PRD.md §8. The result shape matches @hum2music/form's
 * FormResult, since a Composer is typically built on the Motif/
 * Counterpoint/Form engines rather than reinventing note-sequence
 * generation.
 */
export interface ComposerPlugin {
  id: string;
  compose(context: ComposerContext): Promise<ComposerResult>;
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
