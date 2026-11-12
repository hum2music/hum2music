import type { NoteEvent } from "@hum2music/core";

const MIN_MIDI_PITCH = 0;
const MAX_MIDI_PITCH = 127;

/**
 * Pure, non-destructive motif transformations (PRD UPDATE_PRD.md §8.2). Each
 * function returns a new NoteEvent[] built from the input; none mutate
 * their argument, matching the project's non-destructive-transform
 * principle (PRD §6.4/§7.3) extended to this new domain.
 */

export function transpose(notes: NoteEvent[], semitones: number): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    pitch: Math.min(MAX_MIDI_PITCH, Math.max(MIN_MIDI_PITCH, note.pitch + semitones)),
  }));
}

/** Mirrors each note's pitch around `axisPitch` (defaults to the first note's own pitch). */
export function invert(notes: NoteEvent[], axisPitch?: number): NoteEvent[] {
  if (notes.length === 0) return [];
  const axis = axisPitch ?? notes[0].pitch;
  return notes.map((note) => ({
    ...note,
    pitch: Math.min(MAX_MIDI_PITCH, Math.max(MIN_MIDI_PITCH, axis * 2 - note.pitch)),
  }));
}

/** Reverses note order in time, preserving each note's own duration and the sequence's overall start. */
export function retrograde(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return [];
  let cursor = notes[0].startBeat;
  return [...notes].reverse().map((note) => {
    const transformed = { ...note, startBeat: cursor };
    cursor += note.durationBeats;
    return transformed;
  });
}

/** Scales every note's start offset and duration by `factor`, keeping the sequence's own start fixed. */
export function scaleDuration(notes: NoteEvent[], factor: number): NoteEvent[] {
  if (notes.length === 0) return [];
  const origin = notes[0].startBeat;
  return notes.map((note) => ({
    ...note,
    startBeat: origin + (note.startBeat - origin) * factor,
    durationBeats: note.durationBeats * factor,
  }));
}

/** Stretches durations by `factor` (must be > 1); see diminish() to compress. */
export function augment(notes: NoteEvent[], factor: number): NoteEvent[] {
  if (factor <= 1) throw new Error("augment() requires a factor greater than 1; use diminish() to compress.");
  return scaleDuration(notes, factor);
}

/** Compresses durations by `factor` (must be between 0 and 1, exclusive); see augment() to stretch. */
export function diminish(notes: NoteEvent[], factor: number): NoteEvent[] {
  if (factor <= 0 || factor >= 1) {
    throw new Error("diminish() requires a factor strictly between 0 and 1; use augment() to stretch.");
  }
  return scaleDuration(notes, factor);
}

/**
 * Repeats the motif `repetitions` times back-to-back, each repetition
 * transposed by one more multiple of `intervalSemitones` than the last —
 * the classical "sequence" device (a shape repeated at successive pitch
 * levels).
 */
export function sequence(notes: NoteEvent[], intervalSemitones: number, repetitions: number): NoteEvent[] {
  if (notes.length === 0 || repetitions < 1) return [];
  const span = totalSpanBeats(notes);

  const result: NoteEvent[] = [];
  for (let repetition = 0; repetition < repetitions; repetition++) {
    const transposed = transpose(notes, intervalSemitones * repetition);
    for (const note of transposed) {
      result.push({ ...note, startBeat: note.startBeat + span * repetition });
    }
  }
  return result;
}

/** Extracts a contiguous sub-sequence of `length` notes starting at `startIndex`, re-timed to start at the original sequence's own start beat. */
export function fragment(notes: NoteEvent[], startIndex: number, length: number): NoteEvent[] {
  const slice = notes.slice(startIndex, startIndex + length);
  if (slice.length === 0) return [];

  const offset = slice[0].startBeat - notes[0].startBeat;
  return slice.map((note) => ({ ...note, startBeat: note.startBeat - offset }));
}

function totalSpanBeats(notes: NoteEvent[]): number {
  const start = notes[0].startBeat;
  const end = Math.max(...notes.map((note) => note.startBeat + note.durationBeats));
  return end - start;
}
