import type { NoteEvent, PitchCurveSample } from "@hum2music/core";

const MIN_DURATION_BEATS_FOR_VIBRATO = 1;
const VIBRATO_RATE_HZ = 5.5;
const SAMPLE_INTERVAL_MS = 20;

/**
 * Synthesizes vibrato as a sampled pitch-deviation curve (cents over time)
 * on sustained notes, for MIDI export to turn into pitch bend. Short notes
 * are left alone — vibrato needs enough duration to be perceptible.
 */
export function applyVibrato(notes: NoteEvent[], depthCents: number, bpm: number): NoteEvent[] {
  if (depthCents <= 0) return notes;
  const msPerBeat = 60000 / bpm;

  return notes.map((note) => {
    if (note.durationBeats < MIN_DURATION_BEATS_FOR_VIBRATO) return note;

    const durationMs = note.durationBeats * msPerBeat;
    const pitchCurve: PitchCurveSample[] = [];
    for (let offsetMs = 0; offsetMs <= durationMs; offsetMs += SAMPLE_INTERVAL_MS) {
      const phase = (2 * Math.PI * VIBRATO_RATE_HZ * offsetMs) / 1000;
      pitchCurve.push({ offsetMs, cents: Math.sin(phase) * depthCents });
    }

    return { ...note, expression: { ...note.expression, pitchCurve } };
  });
}
