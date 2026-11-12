import { generateBassArrangement } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, InstrumentArranger } from "@hum2music/plugin-api";

const BASS_MIDI_PROGRAM = 33; // GM Electric Bass (finger)
const BASS_MIN_PITCH = 28; // E1
const BASS_MAX_PITCH = 55; // G3

export const bassArranger: InstrumentArranger = {
  id: "@hum2music/instrument-bass/arranger",
  instrumentId: "bass",
  async arrange(context) {
    return generateBassArrangement(context.chords);
  },
};

/**
 * Compatibility wrapper registering the existing (pre-plugin-system) bass
 * arranger from @hum2music/arrangement under the new Plugin API (PRD
 * UPDATE_PRD.md §12 "Built-in Plugin Migration").
 */
export const bassInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-bass",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "bass",
      name: "Bass",
      family: "strings",
      pitchRange: { min: BASS_MIN_PITCH, max: BASS_MAX_PITCH },
      polyphony: 1,
      midi: { program: BASS_MIDI_PROGRAM },
    });
    context.arrangers.register(bassArranger);
  },
};
