import type { NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { humanizeMelody } from "@hum2music/expression";

function melody(): NoteEvent[] {
  return [
    { pitch: 60, startBeat: 0, durationBeats: 1, velocity: 90 },
    { pitch: 62, startBeat: 1, durationBeats: 1, velocity: 90 },
    { pitch: 64, startBeat: 2, durationBeats: 1, velocity: 90 },
    { pitch: 65, startBeat: 3, durationBeats: 1, velocity: 90 },
    { pitch: 67, startBeat: 4, durationBeats: 1, velocity: 90 },
  ];
}

describe("humanizeMelody", () => {
  test("is a no-op at humanizeAmount 0", () => {
    const notes = melody();
    expect(humanizeMelody(notes, { seed: 1, humanizeAmount: 0, bpm: 120 })).toEqual(notes);
  });

  test("is deterministic for the same seed and amount", () => {
    const notes = melody();
    const a = humanizeMelody(notes, { seed: 42, humanizeAmount: 0.8, bpm: 120 });
    const b = humanizeMelody(notes, { seed: 42, humanizeAmount: 0.8, bpm: 120 });
    expect(b).toEqual(a);
  });

  test("produces different results for different seeds", () => {
    const notes = melody();
    const a = humanizeMelody(notes, { seed: 1, humanizeAmount: 0.8, bpm: 120 });
    const b = humanizeMelody(notes, { seed: 2, humanizeAmount: 0.8, bpm: 120 });
    expect(b).not.toEqual(a);
  });

  test("leaves pitch and note count unchanged", () => {
    const notes = melody();
    const result = humanizeMelody(notes, { seed: 1, humanizeAmount: 0.8, bpm: 120 });
    expect(result.map((n) => n.pitch)).toEqual(notes.map((n) => n.pitch));
    expect(result.length).toBe(notes.length);
  });

  test("applies a per-instrument articulation style (bowed strings stay closer to legato than guitar)", () => {
    const violin = humanizeMelody(melody(), { seed: 1, humanizeAmount: 1, bpm: 120, instrument: "violin" });
    const guitar = humanizeMelody(melody(), { seed: 1, humanizeAmount: 1, bpm: 120, instrument: "guitar" });

    // Every note but the last is shaped toward its gap to the next onset;
    // violin's higher articulationGapRatio should hold notes longer.
    for (let i = 0; i < violin.length - 1; i++) {
      expect(violin[i].durationBeats).toBeGreaterThan(guitar[i].durationBeats);
    }
  });
});
