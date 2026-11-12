import { describe, expect, test } from "bun:test";
import { celloInstrumentPlugin } from "@hum2music/instrument-cello";
import { createTestContext, expectDeterministic, validateInstrument } from "@hum2music/testing";

const CHORDS = [
  { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
  { symbol: "F", startBeat: 4, durationBeats: 4, confidence: 1 },
];

describe("celloInstrumentPlugin", () => {
  test("registers a valid, monophonic InstrumentDefinition", () => {
    const context = createTestContext();
    celloInstrumentPlugin.register(context);

    const definition = context.instruments.get("cello");
    expect(definition).toBeDefined();
    expect(definition!.polyphony).toBe(1);
    expect(validateInstrument(definition!)).toEqual([]);
  });

  test("the arranger stays within the registered pitch range and tracks the chord root", async () => {
    const context = createTestContext();
    celloInstrumentPlugin.register(context);
    const instrument = context.instruments.get("cello")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "cello")!;

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
    expect(notes[0].pitch % 12).toBe(0); // C
    expect(notes[1].pitch % 12).toBe(5); // F
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(instrument.pitchRange!.min);
      expect(note.pitch).toBeLessThanOrEqual(instrument.pitchRange!.max);
    }
  });

  test("is deterministic for the same chord progression and seed", async () => {
    const context = createTestContext();
    celloInstrumentPlugin.register(context);
    const instrument = context.instruments.get("cello")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "cello")!;

    await expectDeterministic(() =>
      arranger.arrange({ melody: [], chords: CHORDS, bpm: 100, sections: [], instrument, otherTracks: new Map(), seed: 7 }),
    );
  });
});
