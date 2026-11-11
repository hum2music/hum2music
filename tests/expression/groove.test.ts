import type { SongSection } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { deriveSectionalHumanizeAmount } from "@hum2music/expression";

const sections: SongSection[] = [
  { label: "A", startBarIndex: 0, barCount: 4 },
  { label: "A", startBarIndex: 4, barCount: 4 },
  { label: "B", startBarIndex: 8, barCount: 4 },
];

describe("deriveSectionalHumanizeAmount", () => {
  test("leaves the first occurrence of a section unchanged", () => {
    expect(deriveSectionalHumanizeAmount(0.5, sections, 0)).toBe(0.5);
    expect(deriveSectionalHumanizeAmount(0.5, sections, 8)).toBe(0.5);
  });

  test("boosts intensity when a section's label repeats", () => {
    expect(deriveSectionalHumanizeAmount(0.5, sections, 4)).toBeGreaterThan(0.5);
  });

  test("clamps the boost to 1", () => {
    expect(deriveSectionalHumanizeAmount(0.95, sections, 4)).toBeLessThanOrEqual(1);
  });

  test("returns the base amount unchanged for a bar outside any section", () => {
    expect(deriveSectionalHumanizeAmount(0.5, sections, 20)).toBe(0.5);
  });

  test("returns the base amount unchanged when there are no sections", () => {
    expect(deriveSectionalHumanizeAmount(0.5, [], 0)).toBe(0.5);
  });
});
