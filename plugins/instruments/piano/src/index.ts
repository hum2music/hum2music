import { generatePianoArrangement } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, InstrumentArranger } from "@hum2music/plugin-api";

const PIANO_MIDI_PROGRAM = 0; // GM Acoustic Grand Piano
const PIANO_MIN_PITCH = 21; // A0
const PIANO_MAX_PITCH = 108; // C8

export const pianoArranger: InstrumentArranger = {
  id: "@hum2music/instrument-piano/arranger",
  instrumentId: "piano",
  async arrange(context) {
    return generatePianoArrangement(context.chords, { pattern: "block", allowExtensions: false });
  },
};

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
