import type { NoteEvent, SongSection } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { applySectionalHumanization } from "@hum2music/arrangement";

function melody(): NoteEvent[] {
  return Array.from({ length: 16 }, (_, i) => ({ pitch: 60, startBeat: i, durationBeats: 1, velocity: 90 }));
}

const sections: SongSection[] = [
  { label: "A", startBarIndex: 0, barCount: 1 },
  { label: "A", startBarIndex: 1, barCount: 1 },
  { label: "B", startBarIndex: 2, barCount: 1 },
  { label: "B", startBarIndex: 3, barCount: 1 },
];

describe("applySectionalHumanization", () => {
  test("is a no-op at baseAmount 0", () => {
    const notes = melody();
    expect(applySectionalHumanization(notes, sections, { baseAmount: 0, seed: 1, bpm: 120, instrument: "melody" })).toEqual(
      notes,
    );
  });

  test("is deterministic for the same seed", () => {
    const notes = melody();
    const a = applySectionalHumanization(notes, sections, { baseAmount: 0.6, seed: 3, bpm: 120, instrument: "melody" });
    const b = applySectionalHumanization(notes, sections, { baseAmount: 0.6, seed: 3, bpm: 120, instrument: "melody" });
    expect(b).toEqual(a);
  });

  test("falls back to flat humanization when no sections are given", () => {
    const notes = melody();
    const withEmptySections = applySectionalHumanization(notes, [], {
      baseAmount: 0.6,
      seed: 3,
      bpm: 120,
      instrument: "melody",
    });
    expect(withEmptySections.length).toBe(notes.length);
  });

  test("preserves every note (none dropped or added) across bar partitioning", () => {
    const notes = melody();
    const result = applySectionalHumanization(notes, sections, { baseAmount: 0.6, seed: 5, bpm: 120, instrument: "melody" });
    expect(result).toHaveLength(notes.length);
  });
});
