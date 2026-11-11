import type { NoteEvent } from "@hum2music/core";
import type { BarSegment } from "./chord-candidates";

/** Splits quantized notes into fixed-size bars, per PRD §7.2's 4/4-only MVP scope. */
export function groupNotesIntoBars(notes: NoteEvent[], beatsPerBar = 4): BarSegment[] {
  if (notes.length === 0) return [];

  const lastEndBeat = Math.max(...notes.map((note) => note.startBeat + note.durationBeats));
  const barCount = Math.ceil(lastEndBeat / beatsPerBar);

  const bars: BarSegment[] = Array.from({ length: barCount }, (_, index) => ({
    startBeat: index * beatsPerBar,
    endBeat: (index + 1) * beatsPerBar,
    notes: [],
  }));

  for (const note of notes) {
    const noteEndBeat = note.startBeat + note.durationBeats;
    for (const bar of bars) {
      const overlapStart = Math.max(note.startBeat, bar.startBeat);
      const overlapEnd = Math.min(noteEndBeat, bar.endBeat);
      const overlapBeats = overlapEnd - overlapStart;
      if (overlapBeats > 0) bar.notes.push({ pitch: note.pitch, weight: overlapBeats });
    }
  }

  return bars;
}
