import { describe, expect, test } from "bun:test";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import { createTestContext, expectDeterministic, validateInstrument } from "@hum2music/testing";

describe("violinInstrumentPlugin", () => {
  test("registers a valid, monophonic InstrumentDefinition", () => {
    const context = createTestContext();
    violinInstrumentPlugin.register(context);

    const definition = context.instruments.get("violin");
    expect(definition).toBeDefined();
    expect(definition!.polyphony).toBe(1);
    expect(validateInstrument(definition!)).toEqual([]);
  });

  test("the arranger stays within the registered pitch range", async () => {
    const context = createTestContext();
    violinInstrumentPlugin.register(context);
    const instrument = context.instruments.get("violin")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "violin")!;

    const chords = [
      { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
      { symbol: "G", startBeat: 4, durationBeats: 4, confidence: 1 },
      { symbol: "Am", startBeat: 8, durationBeats: 4, confidence: 1 },
      { symbol: "F", startBeat: 12, durationBeats: 4, confidence: 1 },
    ];

    const notes = await arranger.arrange({
      melody: [],
      chords,
      bpm: 120,
      sections: [],
      instrument,
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.length).toBe(chords.length);
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(instrument.pitchRange!.min);
      expect(note.pitch).toBeLessThanOrEqual(instrument.pitchRange!.max);
    }
  });

  test("is deterministic for the same chord progression and seed", async () => {
    const context = createTestContext();
    violinInstrumentPlugin.register(context);
    const instrument = context.instruments.get("violin")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "violin")!;
    const chords = [
      { symbol: "Dm", startBeat: 0, durationBeats: 4, confidence: 1 },
      { symbol: "G7", startBeat: 4, durationBeats: 4, confidence: 1 },
    ];

    await expectDeterministic(() =>
      arranger.arrange({ melody: [], chords, bpm: 100, sections: [], instrument, otherTracks: new Map(), seed: 7 }),
    );
  });
});
