import { generateDrumArrangement } from "@hum2music/arrangement";
import type { Hum2MusicPlugin, InstrumentArranger } from "@hum2music/plugin-api";

const DRUM_POLYPHONY = 4; // e.g. kick + snare + two hi-hat voices at once

export const drumsArranger: InstrumentArranger = {
  id: "@hum2music/instrument-drums/arranger",
  instrumentId: "drums",
  async arrange(context) {
    const density = context.style?.rhythm?.drumDensity ?? "normal";
    return generateDrumArrangement(context.chords, { density });
  },
};

/**
 * Compatibility wrapper registering the existing (pre-plugin-system) drum
 * arranger from @hum2music/arrangement under the new Plugin API (PRD
 * UPDATE_PRD.md §12 "Built-in Plugin Migration"). Reads the active style's
 * `rhythm.drumDensity` when present, defaulting to "normal".
 */
export const drumsInstrumentPlugin: Hum2MusicPlugin = {
  id: "@hum2music/instrument-drums",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({
      id: "drums",
      name: "Drums",
      family: "percussion",
      polyphony: DRUM_POLYPHONY,
      midi: { percussion: true },
    });
    context.arrangers.register(drumsArranger);
  },
};
