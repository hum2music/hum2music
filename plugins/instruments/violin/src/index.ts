import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
import { violinArranger } from "./arranger.ts";

const VIOLIN_MIDI_PROGRAM = 40; // GM Violin
const VIOLIN_MIN_PITCH = 55; // G3
const VIOLIN_MAX_PITCH = 103; // G7

/**
 * Sample third-party-style Instrument Plugin (PRD UPDATE_PRD.md §5.3's own
 * worked example), demonstrating that a new instrument can be added without
 * changing any existing central code: this package only imports from the
 * public @hum2music/plugin-api and @hum2music/music-theory packages.
 */
export const violinInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-violin",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "violin",
      name: "Violin",
      family: "strings",
      pitchRange: { min: VIOLIN_MIN_PITCH, max: VIOLIN_MAX_PITCH },
      polyphony: 1,
      articulations: ["legato", "staccato", "pizzicato"],
      midi: { program: VIOLIN_MIDI_PROGRAM },
    });
    context.arrangers.register(violinArranger);
  },
};

export { violinArranger } from "./arranger.ts";
