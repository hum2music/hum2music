import { describe, expect, test } from "bun:test";
import { bassInstrumentPlugin } from "@hum2music/instrument-bass";
import { createTestContext, validateInstrument } from "@hum2music/testing";

describe("bassInstrumentPlugin", () => {
  test("registers a valid, monophonic InstrumentDefinition and matching arranger", async () => {
    const context = createTestContext();
    bassInstrumentPlugin.register(context);

    const definition = context.instruments.get("bass");
    expect(definition).toBeDefined();
    expect(definition!.polyphony).toBe(1);
    expect(validateInstrument(definition!)).toEqual([]);

    const arranger = context.arrangers.list().find((a) => a.instrumentId === "bass")!;
    const notes = await arranger.arrange({
      melody: [],
      chords: [{ symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 }],
      bpm: 120,
      sections: [],
      instrument: definition!,
      otherTracks: new Map(),
      seed: 42,
    });
    expect(notes.length).toBeGreaterThan(0);
  });
});
