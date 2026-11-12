import { describe, expect, test } from "bun:test";
import { guitarInstrumentPlugin } from "@hum2music/instrument-guitar";
import { createTestContext, validateInstrument } from "@hum2music/testing";

const CHORDS = [{ symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 }];

describe("guitarInstrumentPlugin", () => {
  test("registers a valid InstrumentDefinition and matching arranger", () => {
    const context = createTestContext();
    guitarInstrumentPlugin.register(context);

    const definition = context.instruments.get("guitar");
    expect(definition).toBeDefined();
    expect(validateInstrument(definition!)).toEqual([]);
  });

  test("defaults to the strum pattern without a style", async () => {
    const context = createTestContext();
    guitarInstrumentPlugin.register(context);
    const definition = context.instruments.get("guitar")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "guitar")!;

    const notes = await arranger.arrange({
      melody: [],
      chords: CHORDS,
      bpm: 120,
      sections: [],
      instrument: definition,
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(definition.pitchRange!.min);
      expect(note.pitch).toBeLessThanOrEqual(definition.pitchRange!.max);
    }
  });
});
