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

  test("ignores the melody by default (chords-only accompaniment, unchanged behavior)", async () => {
    const context = createTestContext();
    pianoInstrumentPlugin.register(context);
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "piano")!;

    const melody = [{ pitch: 84, startBeat: 0, durationBeats: 1, velocity: 90 }];
    const notes = await arranger.arrange({
      melody,
      chords: [{ symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 }],
      bpm: 120,
      sections: [],
      instrument: context.instruments.get("piano")!,
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.some((note) => note.pitch === 84)).toBe(false);
  });

  test("merges the melody into its own track when style.orchestration.pianoIncludeMelody is set", async () => {
    const context = createTestContext();
    pianoInstrumentPlugin.register(context);
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "piano")!;

    const melody = [{ pitch: 84, startBeat: 0, durationBeats: 1, velocity: 90 }];
    const notes = await arranger.arrange({
      melody,
      chords: [{ symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 }],
      bpm: 120,
      sections: [],
      instrument: context.instruments.get("piano")!,
      style: { id: "test", name: "Test", orchestration: { pianoIncludeMelody: true } },
      otherTracks: new Map(),
      seed: 42,
    });

    expect(notes.some((note) => note.pitch === 84)).toBe(true);
    // the chord voicing is still present alongside the melody
    expect(notes.some((note) => note.pitch >= 48 && note.pitch <= 72)).toBe(true);
  });
});
