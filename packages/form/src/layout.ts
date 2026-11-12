import type { NoteEvent, SongSection } from "@hum2music/core";

/** Matches the 4/4 assumption already used elsewhere in the project (e.g. @hum2music/arrangement's sectional-humanize.ts). */
const BEATS_PER_BAR = 4;

export interface FormSegment {
  label: string;
  notes: NoteEvent[];
}

export interface FormResult {
  notes: NoteEvent[];
  sections: SongSection[];
}

/**
 * Lays segments out back-to-back in time (each segment's own internal
 * timing is preserved, just shifted to start right after the previous
 * one ends, rounded up to a whole bar) and produces the matching
 * SongSection labels, reusing the existing SongSection/NoteEvent types
 * rather than introducing a parallel representation (PRD UPDATE_PRD.md
 * §9.1, ADR-004). A segment with no notes is skipped (not given an empty
 * section).
 */
export function layoutSegments(segments: FormSegment[]): FormResult {
  const notes: NoteEvent[] = [];
  const sections: SongSection[] = [];
  let beatCursor = 0;

  for (const segment of segments) {
    if (segment.notes.length === 0) continue;

    const originBeat = segment.notes[0].startBeat;
    const spanBeats = Math.max(...segment.notes.map((note) => note.startBeat + note.durationBeats)) - originBeat;
    const barCount = Math.max(1, Math.ceil(spanBeats / BEATS_PER_BAR));

    for (const note of segment.notes) {
      notes.push({ ...note, startBeat: beatCursor + (note.startBeat - originBeat) });
    }
    sections.push({ label: segment.label, startBarIndex: Math.round(beatCursor / BEATS_PER_BAR), barCount });
    beatCursor += barCount * BEATS_PER_BAR;
  }

  return { notes, sections };
}
