import { describe, expect, test } from "bun:test";
import { violaInstrumentPlugin } from "@hum2music/instrument-viola";
import { createTestContext, expectDeterministic, validateInstrument } from "@hum2music/testing";

const CHORDS = [
  { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
  { symbol: "F", startBeat: 4, durationBeats: 4, confidence: 1 },
];

describe("violaInstrumentPlugin", () => {
  test("registers a valid, monophonic InstrumentDefinition", () => {
    const context = createTestContext();
    violaInstrumentPlugin.register(context);

    const definition = context.instruments.get("viola");
    expect(definition).toBeDefined();
    expect(definition!.polyphony).toBe(1);
    expect(validateInstrument(definition!)).toEqual([]);
  });

  test("the arranger stays within the registered pitch range", async () => {
    const context = createTestContext();
    violaInstrumentPlugin.register(context);
    const instrument = context.instruments.get("viola")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "viola")!;

    const notes = await arranger.arrange({
      melody: [],
      chords: CHORDS,
      bpm: 120,
      sections: [],
      instrument,
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.length).toBe(CHORDS.length);
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(instrument.pitchRange!.min);
      expect(note.pitch).toBeLessThanOrEqual(instrument.pitchRange!.max);
    }
  });

  test("is deterministic for the same chord progression and seed", async () => {
    const context = createTestContext();
    violaInstrumentPlugin.register(context);
    const instrument = context.instruments.get("viola")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "viola")!;

    await expectDeterministic(() =>
      arranger.arrange({ melody: [], chords: CHORDS, bpm: 100, sections: [], instrument, otherTracks: new Map(), seed: 7 }),
    );
  });
});
