import type { ChordEvent, SongSection } from "@hum2music/core";

const DEFAULT_CYCLE_LENGTH_BARS = 4;

/**
 * Detects repeating cycles in the bar-level chord sequence and labels them
 * A, B, C, ... reusing a label whenever an earlier cycle's chord sequence
 * repeats exactly. A simple, defensible stand-in for full song-structure
 * estimation — detecting verse/chorus boundaries from audio/lyrics is out
 * of scope for a rule-based system working from chords alone.
 */
export function estimateSongStructure(chords: ChordEvent[], cycleLengthBars = DEFAULT_CYCLE_LENGTH_BARS): SongSection[] {
  if (chords.length === 0) return [];

  const symbols = chords.map((chord) => chord.symbol);
  const sections: SongSection[] = [];
  const seenCycles: string[] = [];

  for (let start = 0; start < symbols.length; start += cycleLengthBars) {
    const cycle = symbols.slice(start, start + cycleLengthBars);
    const key = cycle.join(",");

    let labelIndex = seenCycles.indexOf(key);
    if (labelIndex === -1) {
      seenCycles.push(key);
      labelIndex = seenCycles.length - 1;
    }

    sections.push({ label: indexToLabel(labelIndex), startBarIndex: start, barCount: cycle.length });
  }

  return sections;
}

function indexToLabel(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}
