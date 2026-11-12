import { generateGuitarArrangement } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, InstrumentArranger } from "@hum2music/plugin-api";

const GUITAR_MIDI_PROGRAM = 25; // GM Acoustic Guitar (steel)
const GUITAR_MIN_PITCH = 40; // E2, standard tuning's lowest open string
const GUITAR_MAX_PITCH = 76; // highest string + the arranger's fret search ceiling

export const guitarArranger: InstrumentArranger = {
  id: "@hum2music/instrument-guitar/arranger",
  instrumentId: "guitar",
  async arrange(context) {
    const pattern = context.style?.rhythm?.guitarPattern ?? "strum";
    return generateGuitarArrangement(context.chords, { pattern });
  },
};

/**
 * Compatibility wrapper registering the existing (pre-plugin-system) guitar
 * arranger from @hum2music/arrangement under the new Plugin API (PRD
 * UPDATE_PRD.md §12 "Built-in Plugin Migration"). Reads the active style's
 * `rhythm.guitarPattern` when present, defaulting to "strum".
 */
export const guitarInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-guitar",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "guitar",
      name: "Guitar",
      family: "strings",
      pitchRange: { min: GUITAR_MIN_PITCH, max: GUITAR_MAX_PITCH },
      polyphony: 6,
      midi: { program: GUITAR_MIDI_PROGRAM },
    });
    context.arrangers.register(guitarArranger);
  },
};
