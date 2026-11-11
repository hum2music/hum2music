import type { NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { applySwing, applyTimingJitter } from "@hum2music/expression";
import { createSeededRandom } from "@hum2music/expression";
import { deriveHumanizeParams } from "@hum2music/expression";

function note(startBeat: number): NoteEvent {
  return { pitch: 60, startBeat, durationBeats: 0.5, velocity: 90 };
}

describe("applySwing", () => {
  test("delays upbeat eighth notes but leaves on-beat notes untouched", () => {
    const notes = [note(0), note(0.5), note(1), note(1.5)];
    const result = applySwing(notes, 1);

    expect(result[0].startBeat).toBe(0);
    expect(result[1].startBeat).toBeGreaterThan(0.5);
    expect(result[2].startBeat).toBe(1);
    expect(result[3].startBeat).toBeGreaterThan(1.5);
  });

  test("is a no-op when swingAmount is 0", () => {
    const notes = [note(0), note(0.5)];
    expect(applySwing(notes, 0)).toEqual(notes);
  });
});

describe("applyTimingJitter", () => {
  test("is deterministic for the same seed", () => {
    const notes = [note(0), note(1), note(2), note(3)];
    const params = deriveHumanizeParams(1, "melody");

    const resultA = applyTimingJitter(notes, params, createSeededRandom(42));
    const resultB = applyTimingJitter(notes, params, createSeededRandom(42));

    expect(resultB).toEqual(resultA);
  });

  test("adds to, rather than overwrites, an existing timingOffsetMs", () => {
    const notes: NoteEvent[] = [{ ...note(1), expression: { timingOffsetMs: 12 } }];
    const params = deriveHumanizeParams(1, "melody");
    const result = applyTimingJitter(notes, params, createSeededRandom(1));

    expect(result[0].expression?.timingOffsetMs).not.toBe(12);
    const jitterOnly = (result[0].expression?.timingOffsetMs ?? 0) - 12;
    expect(Math.abs(jitterOnly)).toBeLessThanOrEqual(params.timingJitterMs + 1e-9);
  });

  test("keeps jitter within the instrument's configured range", () => {
    const notes = Array.from({ length: 200 }, (_, i) => note(i * 0.5));
    const params = deriveHumanizeParams(1, "melody");
    const result = applyTimingJitter(notes, params, createSeededRandom(99));

    for (const n of result) {
      expect(Math.abs(n.expression?.timingOffsetMs ?? 0)).toBeLessThanOrEqual(params.timingJitterMs + 1e-9);
    }
  });

  test("is a no-op when the instrument's timing jitter is 0", () => {
    const notes = [note(0), note(1)];
    const params = deriveHumanizeParams(0, "melody");
    expect(applyTimingJitter(notes, params, createSeededRandom(1))).toEqual(notes);
  });
});
