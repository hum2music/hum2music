import type { SongSection } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { deriveSectionTempoCurve } from "@hum2music/expression";

const SECTIONS: SongSection[] = [
  { label: "A", startBarIndex: 0, barCount: 4 },
  { label: "B", startBarIndex: 4, barCount: 4 },
];

describe("deriveSectionTempoCurve", () => {
  test("is a flat tempo (one entry) when amount is 0", () => {
    expect(deriveSectionTempoCurve(SECTIONS, 120, 0)).toEqual([{ atBeat: 0, bpm: 120 }]);
  });

  test("is a flat tempo when there are no sections", () => {
    expect(deriveSectionTempoCurve([], 120, 1)).toEqual([{ atBeat: 0, bpm: 120 }]);
  });

  test("starts at the base tempo at beat 0", () => {
    const curve = deriveSectionTempoCurve(SECTIONS, 120, 1);
    expect(curve[0]).toEqual({ atBeat: 0, bpm: 120 });
  });

  test("monotonically slows down across the final section", () => {
    const curve = deriveSectionTempoCurve(SECTIONS, 120, 1);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].bpm).toBeLessThan(curve[i - 1].bpm);
    }
  });

  test("every tempo change beyond the first falls within the final section's bars", () => {
    const curve = deriveSectionTempoCurve(SECTIONS, 120, 1);
    const finalSection = SECTIONS[SECTIONS.length - 1];
    const sectionStartBeat = finalSection.startBarIndex * 4;
    const sectionEndBeat = sectionStartBeat + finalSection.barCount * 4;

    for (const change of curve.slice(1)) {
      expect(change.atBeat).toBeGreaterThan(sectionStartBeat);
      expect(change.atBeat).toBeLessThanOrEqual(sectionEndBeat);
    }
  });

  test("a smaller amount produces a smaller final slowdown", () => {
    const full = deriveSectionTempoCurve(SECTIONS, 120, 1);
    const half = deriveSectionTempoCurve(SECTIONS, 120, 0.5);

    expect(half.at(-1)!.bpm).toBeGreaterThan(full.at(-1)!.bpm);
  });

  test("clamps amount above 1 to the same curve as amount 1", () => {
    expect(deriveSectionTempoCurve(SECTIONS, 120, 2)).toEqual(deriveSectionTempoCurve(SECTIONS, 120, 1));
  });

  test("is deterministic", () => {
    const a = deriveSectionTempoCurve(SECTIONS, 120, 1);
    const b = deriveSectionTempoCurve(SECTIONS, 120, 1);
    expect(b).toEqual(a);
  });
});
