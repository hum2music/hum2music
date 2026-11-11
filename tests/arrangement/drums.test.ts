import type { ChordEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { CLOSED_HIHAT_PITCH, generateDrumArrangement, KICK_PITCH, SNARE_PITCH } from "@hum2music/arrangement";

function chord(symbol: string, startBeat: number): ChordEvent {
  return { symbol, startBeat, durationBeats: 4, confidence: 1 };
}

describe("generateDrumArrangement", () => {
  test("produces the basic 4/4 backbeat: kick on 1 & 3, snare on 2 & 4, 8th-note hi-hat", () => {
    const notes = generateDrumArrangement([chord("C", 0)]);

    const kicks = notes.filter((n) => n.pitch === KICK_PITCH).map((n) => n.startBeat);
    const snares = notes.filter((n) => n.pitch === SNARE_PITCH).map((n) => n.startBeat);
    const hihats = notes.filter((n) => n.pitch === CLOSED_HIHAT_PITCH).map((n) => n.startBeat);

    expect(kicks.sort((a, b) => a - b)).toEqual([0, 2]);
    expect(snares.sort((a, b) => a - b)).toEqual([1, 3]);
    expect(hihats).toHaveLength(8);
    expect(hihats.sort((a, b) => a - b)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  });

  test("repeats the pattern once per bar", () => {
    const notes = generateDrumArrangement([chord("C", 0), chord("F", 4)]);
    expect(notes.filter((n) => n.pitch === KICK_PITCH)).toHaveLength(4);
    expect(notes.filter((n) => n.startBeat >= 4)).toHaveLength(12);
  });
});
