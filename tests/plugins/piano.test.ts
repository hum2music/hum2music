import { describe, expect, test } from "bun:test";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { createTestContext, validateInstrument } from "@hum2music/testing";

describe("pianoInstrumentPlugin", () => {
  test("registers a valid InstrumentDefinition and matching arranger", () => {
    const context = createTestContext();
    pianoInstrumentPlugin.register(context);

    const definition = context.instruments.get("piano");
    expect(definition).toBeDefined();
    expect(validateInstrument(definition!)).toEqual([]);

    const arranger = context.arrangers.list().find((a) => a.instrumentId === "piano");
    expect(arranger).toBeDefined();
  });

  test("the arranger reuses the existing @hum2music/arrangement piano voicing logic", async () => {
    const context = createTestContext();
    pianoInstrumentPlugin.register(context);
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "piano")!;

    const notes = await arranger.arrange({
      melody: [],
      chords: [{ symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 }],
      bpm: 120,
      sections: [],
      instrument: context.instruments.get("piano")!,
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(48);
      expect(note.pitch).toBeLessThanOrEqual(72);
    }
  });
});
