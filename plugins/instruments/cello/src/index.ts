import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
import { celloArranger } from "./arranger.ts";

const CELLO_MIDI_PROGRAM = 42; // GM Cello
const CELLO_MIN_PITCH = 36; // C2
const CELLO_MAX_PITCH = 76; // E5

export const celloInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-cello",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "cello",
      name: "Cello",
      family: "strings",
      pitchRange: { min: CELLO_MIN_PITCH, max: CELLO_MAX_PITCH },
      polyphony: 1,
      articulations: ["legato", "staccato", "pizzicato"],
      midi: { program: CELLO_MIDI_PROGRAM },
    });
    context.arrangers.register(celloArranger);
  },
};

export { celloArranger } from "./arranger.ts";
