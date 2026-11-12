import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
import { violaArranger } from "./arranger.js";

const VIOLA_MIDI_PROGRAM = 41; // GM Viola
const VIOLA_MIN_PITCH = 48; // C3
const VIOLA_MAX_PITCH = 91; // G6

export const violaInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-viola",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "viola",
      name: "Viola",
      family: "strings",
      pitchRange: { min: VIOLA_MIN_PITCH, max: VIOLA_MAX_PITCH },
      polyphony: 1,
      articulations: ["legato", "staccato", "pizzicato"],
      midi: { program: VIOLA_MIDI_PROGRAM },
    });
    context.arrangers.register(violaArranger);
  },
};

export { violaArranger } from "./arranger.js";
