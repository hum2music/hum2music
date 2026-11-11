import type { NoteEvent } from "@hum2music/core";
import type { MidiNoteEvent } from "./smf-writer";

/**
 * Converts beat-relative `NoteEvent`s (as produced by quantization/
 * humanization) into absolute-ms `MidiNoteEvent`s ready for
 * `writeStandardMidiFile`. `expression.timingOffsetMs` is added on top of
 * the grid position rather than discarded, and `expression.pitchCurve`
 * passes through for pitch-bend export.
 */
export function noteEventsToMidiNotes(notes: NoteEvent[], bpm: number): MidiNoteEvent[] {
  const msPerBeat = 60000 / bpm;

  return notes.map((note) => ({
    pitch: note.pitch,
    startMs: note.startBeat * msPerBeat + (note.expression?.timingOffsetMs ?? 0),
    durationMs: note.durationBeats * msPerBeat,
    velocity: note.velocity,
    pitchCurve: note.expression?.pitchCurve,
  }));
}
