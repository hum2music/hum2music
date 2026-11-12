import type { NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import {
  applyArticulation,
  applyDynamicArc,
  applyVelocityHumanization,
  createSeededRandom,
  deriveHumanizeParams,
} from "@hum2music/expression";

function note(startBeat: number, velocity = 90): NoteEvent {
  return { pitch: 60, startBeat, durationBeats: 1, velocity };
}

describe("applyVelocityHumanization", () => {
  test("accents downbeats more than off-beat notes, on average", () => {
    const notes = [note(0), note(1), note(2), note(3), note(4), note(5), note(6), note(7)];
    const params = deriveHumanizeParams(1, "melody");
    const result = applyVelocityHumanization(notes, params, createSeededRandom(7));

    const downbeatDeltas = [0, 4].map((i) => result[i].velocity - 90);
    const offbeatDeltas = [1, 2, 3, 5, 6, 7].map((i) => result[i].velocity - 90);

    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg(downbeatDeltas)).toBeGreaterThan(avg(offbeatDeltas));
  });

  test("clamps velocity to the valid MIDI range", () => {
    const notes = [note(0, 125), note(4, 2)];
    const params = deriveHumanizeParams(1, "melody");
    const result = applyVelocityHumanization(notes, params, createSeededRandom(123));

    for (const n of result) {
      expect(n.velocity).toBeGreaterThanOrEqual(1);
      expect(n.velocity).toBeLessThanOrEqual(127);
    }
  });

  test("is deterministic for the same seed", () => {
    const notes = [note(0), note(1), note(2)];
    const params = deriveHumanizeParams(1, "melody");
    const a = applyVelocityHumanization(notes, params, createSeededRandom(5));
    const b = applyVelocityHumanization(notes, params, createSeededRandom(5));
    expect(b).toEqual(a);
  });
});

describe("applyDynamicArc", () => {
  test("swells up then back down across the melody", () => {
    const notes = Array.from({ length: 9 }, (_, i) => note(i));
    const result = applyDynamicArc(notes, 1);

    expect(result[0].velocity).toBe(90);
    expect(result[notes.length - 1].velocity).toBe(90);
    expect(result[4].velocity).toBeGreaterThan(90);
  });

  test("is a no-op when amount is 0", () => {
    const notes = [note(0), note(1), note(2)];
    expect(applyDynamicArc(notes, 0)).toEqual(notes);
  });
});

describe("applyArticulation", () => {
  function noteWithDuration(startBeat: number, durationBeats: number): NoteEvent {
    return { pitch: 60, startBeat, durationBeats, velocity: 90 };
  }

  test("shortens a note toward gapRatio of its gap to the next onset", () => {
    const notes = [noteWithDuration(0, 1), noteWithDuration(1, 1)];
    const result = applyArticulation(notes, 0.5);
    expect(result[0].durationBeats).toBe(0.5); // gap to next onset is 1 beat, held for half of it
  });

  test("never extends a note beyond its own written duration", () => {
    // A short note (0.5 beats) with a wide gap (2 beats) to the next onset
    // should be shaped relative to its own duration, not the wider gap.
    const notes = [noteWithDuration(0, 0.5), noteWithDuration(2, 1)];
    const result = applyArticulation(notes, 1);
    expect(result[0].durationBeats).toBe(0.5);
  });

  test("leaves the last note untouched (no following onset to shape toward)", () => {
    const notes = [noteWithDuration(0, 1), noteWithDuration(1, 1)];
    const result = applyArticulation(notes, 0.5);
    expect(result[1].durationBeats).toBe(1);
  });

  test("leaves simultaneous notes (e.g. a chord) untouched", () => {
    const notes = [noteWithDuration(0, 1), noteWithDuration(0, 1)];
    const result = applyArticulation(notes, 0.5);
    expect(result[0].durationBeats).toBe(1);
  });

  test("is a no-op when gapRatio is 1", () => {
    const notes = [noteWithDuration(0, 1), noteWithDuration(1, 1)];
    expect(applyArticulation(notes, 1)).toEqual(notes);
  });
});
