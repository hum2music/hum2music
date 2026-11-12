import { describe, expect, test } from "bun:test";
import { closestToneInRange } from "@hum2music/music-theory";

describe("closestToneInRange", () => {
  test("picks the octave of a pitch class nearest to the previous pitch", () => {
    // Pitch class 0 (C) placed near previousPitch=62 (D4): candidates are 48, 60, 72 -> 60 is closest.
    expect(closestToneInRange([0], 62, { min: 36, max: 84 })).toBe(60);
  });

  test("stays within the given range", () => {
    const result = closestToneInRange([0], 200, { min: 36, max: 60 });
    expect(result).toBeGreaterThanOrEqual(36);
    expect(result).toBeLessThanOrEqual(60);
  });

  test("picks the closest among several candidate pitch classes", () => {
    // Pitch classes 0 (C) and 7 (G) near previousPitch=65 (F4): candidates include 60(C),67(G),72(C) -> 67 is closest.
    expect(closestToneInRange([0, 7], 65, { min: 36, max: 84 })).toBe(67);
  });
});
