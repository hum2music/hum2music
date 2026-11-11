import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { composeTracks } from "@hum2music/arrangement";

function melody(): NoteEvent[] {
  return [
    { pitch: 60, startBeat: 0, durationBeats: 4, velocity: 90 },
    { pitch: 64, startBeat: 4, durationBeats: 4, velocity: 90 },
  ];
}

function chords(): ChordEvent[] {
  return [
    { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
    { symbol: "F", startBeat: 4, durationBeats: 4, confidence: 1 },
  ];
}

describe("composeTracks", () => {
  test("includes only the melody when no instruments are requested", () => {
    const tracks = composeTracks({ melody: melody(), chords: chords(), instruments: [], bpm: 120 });
    expect(tracks.map((t) => t.instrument)).toEqual(["melody"]);
  });

  test("includes melody plus every requested instrument, in order", () => {
    const tracks = composeTracks({ melody: melody(), chords: chords(), bpm: 120 });
    expect(tracks.map((t) => t.instrument)).toEqual(["melody", "piano", "bass", "drums"]);
  });

  test("assigns drums to channel 9 and no program change, melody to channel 0", () => {
    const tracks = composeTracks({ melody: melody(), chords: chords(), bpm: 120 });
    const drums = tracks.find((t) => t.instrument === "drums")!;
    const melodyTrack = tracks.find((t) => t.instrument === "melody")!;
    expect(drums.channel).toBe(9);
    expect(drums.programNumber).toBeUndefined();
    expect(melodyTrack.channel).toBe(0);
  });

  test("honors a subset of instruments", () => {
    const tracks = composeTracks({ melody: melody(), chords: chords(), instruments: ["bass"], bpm: 120 });
    expect(tracks.map((t) => t.instrument)).toEqual(["melody", "bass"]);
  });

  test("leaves all tracks unchanged at humanizeAmount 0", () => {
    const withoutHumanize = composeTracks({ melody: melody(), chords: chords(), humanizeAmount: 0, bpm: 120 });
    const plain = composeTracks({ melody: melody(), chords: chords(), bpm: 120 });
    expect(withoutHumanize).toEqual(plain);
  });

  test("humanizes every included track deterministically", () => {
    const a = composeTracks({ melody: melody(), chords: chords(), humanizeAmount: 0.8, seed: 5, bpm: 120 });
    const b = composeTracks({ melody: melody(), chords: chords(), humanizeAmount: 0.8, seed: 5, bpm: 120 });
    expect(b).toEqual(a);

    const plain = composeTracks({ melody: melody(), chords: chords(), bpm: 120 });
    expect(a).not.toEqual(plain);
  });
});
