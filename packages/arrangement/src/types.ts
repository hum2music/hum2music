import type { ChordEvent, NoteEvent } from "@hum2music/core";

/** Everything an arranger needs: a chord progression (one chord per bar, per harmony's grouping). */
export interface ArrangementContext {
  chords: ChordEvent[];
}

/** Common interface so each instrument's arranger is independently swappable (PRD §9.1). */
export interface InstrumentArranger {
  generate(context: ArrangementContext): NoteEvent[];
}
