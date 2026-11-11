import type { ChordEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { generateBassArrangement } from "@hum2music/arrangement";

function chord(symbol: string, startBeat: number): ChordEvent {
  return { symbol, startBeat, durationBeats: 4, confidence: 1 };
}

describe("generateBassArrangement", () => {
  test("plays the root on beats 1 and 3, and an approach note into the next chord's root on beat 4", () => {
    const notes = generateBassArrangement([chord("C", 0), chord("F", 4)]);
    const bar0 = notes.filter((n) => n.startBeat >= 0 && n.startBeat < 4).sort((a, b) => a.startBeat - b.startBeat);

    expect(bar0).toHaveLength(3);
    expect(bar0[0]).toMatchObject({ pitch: 36, startBeat: 0, durationBeats: 2 }); // C2, beats 1-2
    expect(bar0[1]).toMatchObject({ pitch: 36, startBeat: 2, durationBeats: 1 }); // C2, beat 3
    expect(bar0[2]).toMatchObject({ pitch: 40, startBeat: 3, durationBeats: 1 }); // F2 (41) - 1 semitone, beat 4
  });

  test("holds the root through beat 4 on the final bar (no next chord to approach)", () => {
    const notes = generateBassArrangement([chord("C", 0)]);
    const lastNote = notes.sort((a, b) => a.startBeat - b.startBeat).at(-1)!;
    expect(lastNote).toMatchObject({ pitch: 36, startBeat: 3, durationBeats: 1 });
  });

  test("skips a bar whose chord symbol can't be parsed", () => {
    const notes = generateBassArrangement([chord("Cadd9", 0), chord("C", 4)]);
    expect(notes.every((note) => note.startBeat >= 4)).toBe(true);
  });
});
