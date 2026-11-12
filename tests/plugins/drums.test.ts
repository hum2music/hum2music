import { describe, expect, test } from "bun:test";
import { drumsInstrumentPlugin } from "@hum2music/instrument-drums";
import { createTestContext, validateInstrument } from "@hum2music/testing";

const CHORDS = [
  { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
  { symbol: "G", startBeat: 4, durationBeats: 4, confidence: 1 },
];

describe("drumsInstrumentPlugin", () => {
  test("registers a valid, percussion InstrumentDefinition and matching arranger", () => {
    const context = createTestContext();
    drumsInstrumentPlugin.register(context);

    const definition = context.instruments.get("drums");
    expect(definition).toBeDefined();
    expect(definition!.midi?.percussion).toBe(true);
    expect(validateInstrument(definition!)).toEqual([]);
  });

  test("defaults to normal density without a style", async () => {
    const context = createTestContext();
    drumsInstrumentPlugin.register(context);
    const definition = context.instruments.get("drums")!;
    const arranger = context.arrangers.list().find((a) => a.instrumentId === "drums")!;

    const normal = await arranger.arrange({
      melody: [],
      chords: CHORDS,
      bpm: 120,
      sections: [],
      instrument: definition,
      otherTracks: new Map(),
      seed: 42,
    });

    const sparse = await arranger.arrange({
      melody: [],
      chords: CHORDS,
      bpm: 120,
      sections: [],
      instrument: definition,
      style: {
        id: "ballad",
        name: "Ballad",
        rhythm: { drumDensity: "sparse" },
      },
      otherTracks: new Map(),
      seed: 42,
    });

    expect(sparse.length).toBeLessThan(normal.length);
  });
});
