import type { SongSection } from "@hum2music/core";

const REPEAT_INTENSITY_BOOST = 0.15;

/**
 * Looks up which song section a bar falls in and, if that section's label
 * has occurred earlier (a repeated cycle — e.g. the second time through a
 * chorus), nudges the humanize intensity up a little rather than leaving
 * every repeat identically flat. A simple, rule-based "advanced groove"
 * variation driven by song structure rather than randomness.
 */
export function deriveSectionalHumanizeAmount(baseAmount: number, sections: SongSection[], barIndex: number): number {
  const sectionIndex = sections.findIndex(
    (section) => barIndex >= section.startBarIndex && barIndex < section.startBarIndex + section.barCount,
  );
  if (sectionIndex === -1) return baseAmount;

  const label = sections[sectionIndex].label;
  const isRepeat = sections.slice(0, sectionIndex).some((section) => section.label === label);
  if (!isRepeat) return baseAmount;

  return Math.min(1, baseAmount + REPEAT_INTENSITY_BOOST);
}
