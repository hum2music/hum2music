import type { NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { applyVibrato } from "@hum2music/expression";

describe("applyVibrato", () => {
  test("adds an oscillating pitch curve to sustained notes", () => {
    const notes: NoteEvent[] = [{ pitch: 60, startBeat: 0, durationBeats: 2, velocity: 90 }];
    const [result] = applyVibrato(notes, 25, 120);

    const curve = result.expression?.pitchCurve ?? [];
    expect(curve.length).toBeGreaterThan(1);
    expect(Math.max(...curve.map((s) => s.cents))).toBeGreaterThan(0);
    expect(Math.min(...curve.map((s) => s.cents))).toBeLessThan(0);
    for (const sample of curve) {
      expect(Math.abs(sample.cents)).toBeLessThanOrEqual(25 + 1e-9);
    }
  });

  test("leaves short notes untouched", () => {
    const notes: NoteEvent[] = [{ pitch: 60, startBeat: 0, durationBeats: 0.25, velocity: 90 }];
    const [result] = applyVibrato(notes, 25, 120);
    expect(result.expression?.pitchCurve).toBeUndefined();
  });

  test("is a no-op when depth is 0", () => {
    const notes: NoteEvent[] = [{ pitch: 60, startBeat: 0, durationBeats: 2, velocity: 90 }];
    expect(applyVibrato(notes, 0, 120)).toEqual(notes);
  });
});
