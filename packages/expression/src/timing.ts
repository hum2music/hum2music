import type { NoteEvent } from "@hum2music/core";
import type { InstrumentHumanizeParams } from "./humanize-params";

const EIGHTH_NOTE_BEATS = 0.5;
/** At full swingAmount, an upbeat eighth note is delayed by half an eighth note (a sixteenth). */
const SWING_DELAY_FRACTION_OF_EIGHTH = 0.5;
const POSITION_EPSILON_BEATS = 1e-6;

/** Delays upbeat eighth notes to create a swing feel; on-the-beat notes are untouched. */
export function applySwing(notes: NoteEvent[], swingAmount: number): NoteEvent[] {
  if (swingAmount <= 0) return notes;

  return notes.map((note) => {
    const positionInBeat = note.startBeat % 1;
    const isUpbeatEighth = Math.abs(positionInBeat - 0.5) < POSITION_EPSILON_BEATS;
    if (!isUpbeatEighth) return note;

    const delayBeats = swingAmount * EIGHTH_NOTE_BEATS * SWING_DELAY_FRACTION_OF_EIGHTH;
    return { ...note, startBeat: note.startBeat + delayBeats };
  });
}

/**
 * Adds small, seeded timing deviations, layered on top of any existing
 * `timingOffsetMs` (e.g. the original humming's micro-timing preserved
 * from quantization) rather than overwriting it. Deviations are scaled
 * down on strong metrical positions (on the beat) versus weak ones (off
 * the beat) — the jitter's *range* is rule-based, not an unconditional
 * flat random shift applied everywhere (PRD §10.5, §11.3).
 */
export function applyTimingJitter(
  notes: NoteEvent[],
  params: InstrumentHumanizeParams,
  random: () => number,
): NoteEvent[] {
  if (params.timingJitterMs <= 0) return notes;

  return notes.map((note) => {
    const isOnBeat = Math.abs(note.startBeat % 1) < POSITION_EPSILON_BEATS;
    const positionalScale = isOnBeat ? 0.4 : 1;
    const jitterMs = (random() * 2 - 1) * params.timingJitterMs * positionalScale;
    const existingOffsetMs = note.expression?.timingOffsetMs ?? 0;

    return {
      ...note,
      expression: { ...note.expression, timingOffsetMs: existingOffsetMs + jitterMs },
    };
  });
}
