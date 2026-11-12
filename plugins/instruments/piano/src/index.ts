import type { NoteEvent } from "@hum2music/core";
import { generatePianoArrangement } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, InstrumentArranger } from "@hum2music/plugin-api";

const PIANO_MIDI_PROGRAM = 0; // GM Acoustic Grand Piano
const PIANO_MIN_PITCH = 21; // A0
const PIANO_MAX_PITCH = 108; // C8

export const pianoArranger: InstrumentArranger = {
  id: "@hum2music/instrument-piano/arranger",
  instrumentId: "piano",
  async arrange(context) {
    const pattern = context.style?.orchestration?.pianoPattern ?? "block";
    const allowExtensions = context.style?.orchestration?.pianoAllowExtensions ?? false;
    const voicing = generatePianoArrangement(context.chords, { pattern, allowExtensions });

    if (!context.style?.orchestration?.pianoIncludeMelody || context.melody.length === 0) {
      return voicing;
    }

    // Piano-solo texture: the input melody (right hand) layered over the
    // chord voicing (left hand) in this one instrument's track, rather
    // than chords-only accompaniment expecting a separate melody track.
    return mergeNotesByTime(voicing, context.melody);
  },
};

function mergeNotesByTime(a: NoteEvent[], b: NoteEvent[]): NoteEvent[] {
  return [...a, ...b].sort((left, right) => left.startBeat - right.startBeat);
}

/**
 * Compatibility wrapper registering the existing (pre-plugin-system) piano
 * arranger from @hum2music/arrangement under the new Plugin API, per
 * UPDATE_PRD.md §12 "Phase 2: Built-in Plugin Migration" — the existing
 * behavior is reused as-is, not reimplemented.
 */
export const pianoInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-piano",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "piano",
      name: "Piano",
      family: "keyboard",
      pitchRange: { min: PIANO_MIN_PITCH, max: PIANO_MAX_PITCH },
      polyphony: 10,
      midi: { program: PIANO_MIDI_PROGRAM },
    });
    context.arrangers.register(pianoArranger);
  },
};
