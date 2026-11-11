import type { ChordEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { estimateSongStructure } from "@hum2music/harmony";

function chords(symbols: string[]): ChordEvent[] {
  return symbols.map((symbol, i) => ({ symbol, startBeat: i * 4, durationBeats: 4, confidence: 1 }));
}

describe("estimateSongStructure", () => {
  test("labels a repeated 4-bar cycle with the same letter", () => {
    const sections = estimateSongStructure(chords(["C", "F", "G", "C", "C", "F", "G", "C"]));
    expect(sections.map((s) => s.label)).toEqual(["A", "A"]);
    expect(sections[0]).toEqual({ label: "A", startBarIndex: 0, barCount: 4 });
    expect(sections[1]).toEqual({ label: "A", startBarIndex: 4, barCount: 4 });
  });

  test("gives a new letter to a cycle that differs from earlier ones", () => {
    const sections = estimateSongStructure(chords(["C", "F", "G", "C", "C", "F", "G", "C", "Am", "F", "G", "C"]));
    expect(sections.map((s) => s.label)).toEqual(["A", "A", "B"]);
  });

  test("handles a trailing partial cycle", () => {
    const sections = estimateSongStructure(chords(["C", "F", "G", "C", "Am", "F"]));
    expect(sections).toHaveLength(2);
    expect(sections[1].barCount).toBe(2);
  });

  test("returns an empty list for no chords", () => {
    expect(estimateSongStructure([])).toEqual([]);
  });
});
