import type { NoteEvent } from "@hum2music/core";

/**
 * Takes the first `length` notes of the melody as "the motif". A real
 * motivic-analysis algorithm (recurring-pattern detection, phrase
 * boundaries, etc.) is future work — this is an intentionally naive,
 * explicitly-documented starting point, not a claim of real motif
 * discovery (see tasks/STATUS.md).
 */
export function extractMotif(melody: NoteEvent[], length: number): NoteEvent[] {
  return melody.slice(0, length);
}
