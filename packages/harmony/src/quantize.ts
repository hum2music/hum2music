import type { NoteEvent } from "@hum2music/core";
import type { TimedNote } from "./timed-note";

/** Sixteenth-note grid: fine enough that quarter/eighth/dotted values fall exactly on it. */
const GRID_STEP_BEATS = 1 / 4;

/**
 * Converts absolute-time notes to beat-relative notes for a given tempo
 * hypothesis, snapping to the nearest sixteenth-note grid position. The
 * pre-quantization timing is preserved in `expression.timingOffsetMs`
 * (PRD §7.3) rather than discarded.
 */
export function quantizeToBeats(notes: TimedNote[], bpm: number): NoteEvent[] {
  const msPerBeat = 60000 / bpm;

  return notes.map((note) => {
    const rawStartBeat = note.startMs / msPerBeat;
    const startBeat = roundToGrid(rawStartBeat);
    const durationBeats = Math.max(GRID_STEP_BEATS, roundToGrid(note.durationMs / msPerBeat));

    return {
      pitch: note.pitch,
      startBeat,
      durationBeats,
      velocity: note.velocity,
      expression: {
        timingOffsetMs: (rawStartBeat - startBeat) * msPerBeat,
      },
    };
  });
}

function roundToGrid(valueInBeats: number): number {
  return Math.round(valueInBeats / GRID_STEP_BEATS) * GRID_STEP_BEATS;
}
