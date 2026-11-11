import { describe, expect, test } from "bun:test";
import { computeDrumHumanization, createSeededRandom, deriveHumanizeParams } from "@hum2music/expression";

describe("computeDrumHumanization", () => {
  test("is deterministic for the same seed", () => {
    const params = deriveHumanizeParams(1, "drums");
    const a = computeDrumHumanization(params, 0, createSeededRandom(10));
    const b = computeDrumHumanization(params, 0, createSeededRandom(10));
    expect(b).toEqual(a);
  });

  test("keeps values within the instrument's parameter ranges", () => {
    const params = deriveHumanizeParams(1, "drums");
    const random = createSeededRandom(55);
    for (let beat = 0; beat < 16; beat++) {
      const result = computeDrumHumanization(params, beat, random);
      expect(Math.abs(result.timingOffsetMs)).toBeLessThanOrEqual(params.timingJitterMs + 1e-9);
      expect(Math.abs(result.velocityOffset)).toBeLessThanOrEqual(params.velocityJitterAmount + 1e-9);
      expect(result.swingAmount).toBe(params.swingAmount);
      expect(result.ghostNoteProbability).toBe(params.ghostNoteProbability);
    }
  });

  test("dampens the range on downbeats compared to off-beats", () => {
    const params = deriveHumanizeParams(1, "drums");
    const downbeatMagnitudes = Array.from({ length: 50 }, (_, i) =>
      Math.abs(computeDrumHumanization(params, 0, createSeededRandom(i)).timingOffsetMs),
    );
    const offbeatMagnitudes = Array.from({ length: 50 }, (_, i) =>
      Math.abs(computeDrumHumanization(params, 1, createSeededRandom(i)).timingOffsetMs),
    );

    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg(downbeatMagnitudes)).toBeLessThan(avg(offbeatMagnitudes));
  });
});
