import { describe, expect, test } from "bun:test";
import type { NoteEvent } from "@hum2music/core";
import { extractMotif, augment, diminish, fragment, invert, retrograde, sequence, transpose } from "@hum2music/motif";

function note(pitch: number, startBeat: number, durationBeats: number, velocity = 80): NoteEvent {
  return { pitch, startBeat, durationBeats, velocity };
}

const MOTIF: NoteEvent[] = [note(60, 0, 1), note(62, 1, 1), note(64, 2, 2)];

describe("transpose", () => {
  test("shifts every pitch by the given number of semitones", () => {
    expect(transpose(MOTIF, 7).map((n) => n.pitch)).toEqual([67, 69, 71]);
  });

  test("clamps to the valid MIDI pitch range", () => {
    expect(transpose([note(125, 0, 1)], 10)[0].pitch).toBe(127);
    expect(transpose([note(2, 0, 1)], -10)[0].pitch).toBe(0);
  });

  test("does not mutate the input", () => {
    const original = [...MOTIF];
    transpose(MOTIF, 5);
    expect(MOTIF).toEqual(original);
  });
});

describe("invert", () => {
  test("mirrors pitches around the first note by default", () => {
    // axis = 60: 60->60, 62->58, 64->56
    expect(invert(MOTIF).map((n) => n.pitch)).toEqual([60, 58, 56]);
  });

  test("mirrors around an explicit axis pitch", () => {
    expect(invert(MOTIF, 64).map((n) => n.pitch)).toEqual([68, 66, 64]);
  });
});

describe("retrograde", () => {
  test("reverses note order while preserving each note's own duration", () => {
    const result = retrograde(MOTIF);
    expect(result.map((n) => n.pitch)).toEqual([64, 62, 60]);
    expect(result.map((n) => n.durationBeats)).toEqual([2, 1, 1]);
    expect(result[0].startBeat).toBe(0);
    expect(result[1].startBeat).toBe(2);
    expect(result[2].startBeat).toBe(3);
  });
});

describe("augment / diminish", () => {
  test("augment stretches durations and start offsets by the given factor", () => {
    const result = augment(MOTIF, 2);
    expect(result.map((n) => n.durationBeats)).toEqual([2, 2, 4]);
    expect(result.map((n) => n.startBeat)).toEqual([0, 2, 4]);
  });

  test("diminish compresses durations and start offsets by the given factor", () => {
    const result = diminish(MOTIF, 0.5);
    expect(result.map((n) => n.durationBeats)).toEqual([0.5, 0.5, 1]);
    expect(result.map((n) => n.startBeat)).toEqual([0, 0.5, 1]);
  });

  test("augment rejects a factor that would not stretch", () => {
    expect(() => augment(MOTIF, 1)).toThrow(/greater than 1/);
  });

  test("diminish rejects a factor that would not compress", () => {
    expect(() => diminish(MOTIF, 1)).toThrow(/between 0 and 1/);
  });
});

describe("sequence", () => {
  test("repeats the motif transposed and shifted later in time each repetition", () => {
    const result = sequence(MOTIF, 2, 2);
    expect(result).toHaveLength(6);
    expect(result.slice(0, 3).map((n) => n.pitch)).toEqual([60, 62, 64]);
    expect(result.slice(3).map((n) => n.pitch)).toEqual([62, 64, 66]);
    // second repetition starts right after the first motif's total span (4 beats)
    expect(result[3].startBeat).toBe(4);
  });
});

describe("fragment", () => {
  test("extracts a contiguous sub-sequence re-timed to start at 0", () => {
    const result = fragment(MOTIF, 1, 2);
    expect(result.map((n) => n.pitch)).toEqual([62, 64]);
    expect(result[0].startBeat).toBe(0);
    expect(result[1].startBeat).toBe(1);
  });

  test("returns an empty array when the start index is out of range", () => {
    expect(fragment(MOTIF, 10, 2)).toEqual([]);
  });
});

describe("extractMotif", () => {
  test("takes the first N notes of the melody", () => {
    expect(extractMotif(MOTIF, 2)).toEqual(MOTIF.slice(0, 2));
  });
});
