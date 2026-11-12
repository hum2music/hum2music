import { describe, expect, test } from "bun:test";
import type { NoteEvent } from "@hum2music/core";
import { augment, invert, transpose } from "@hum2music/motif";
import { binaryForm, layoutSegments, ternaryForm, themeAndVariations } from "@hum2music/form";

function note(pitch: number, startBeat: number, durationBeats: number): NoteEvent {
  return { pitch, startBeat, durationBeats, velocity: 80 };
}

// A one-bar (4-beat) theme.
const THEME: NoteEvent[] = [note(60, 0, 1), note(62, 1, 1), note(64, 2, 2)];
const CONTRAST: NoteEvent[] = [note(67, 0, 2), note(65, 2, 2)];

describe("layoutSegments", () => {
  test("places segments back-to-back, each starting a whole bar after the previous one ends", () => {
    const result = layoutSegments([
      { label: "A", notes: THEME },
      { label: "B", notes: CONTRAST },
    ]);

    expect(result.sections).toEqual([
      { label: "A", startBarIndex: 0, barCount: 1 },
      { label: "B", startBarIndex: 1, barCount: 1 },
    ]);
    expect(result.notes).toHaveLength(THEME.length + CONTRAST.length);
    expect(result.notes[0].startBeat).toBe(0);
    expect(result.notes[THEME.length].startBeat).toBe(4); // B starts at bar 1 = beat 4
  });

  test("skips an empty segment rather than emitting a zero-length section", () => {
    const result = layoutSegments([{ label: "A", notes: THEME }, { label: "B", notes: [] }]);
    expect(result.sections).toHaveLength(1);
  });
});

describe("binaryForm / ternaryForm", () => {
  test("binaryForm produces an A B structure", () => {
    const result = binaryForm(THEME, CONTRAST);
    expect(result.sections.map((s) => s.label)).toEqual(["A", "B"]);
  });

  test("ternaryForm produces an A B A' structure where A and A' share the same pitches", () => {
    const result = ternaryForm(THEME, CONTRAST);
    expect(result.sections.map((s) => s.label)).toEqual(["A", "B", "A'"]);

    const aPitches = result.notes.slice(0, THEME.length).map((n) => n.pitch);
    const aPrimePitches = result.notes.slice(-THEME.length).map((n) => n.pitch);
    expect(aPrimePitches).toEqual(aPitches);
  });
});

describe("themeAndVariations", () => {
  test("lays out the theme followed by each transformed variation", () => {
    const result = themeAndVariations(THEME, [
      { label: "Var. 1 (transposed up a 5th)", transform: (notes) => transpose(notes, 7) },
      { label: "Var. 2 (inverted)", transform: (notes) => invert(notes) },
      { label: "Var. 3 (augmented)", transform: (notes) => augment(notes, 2) },
    ]);

    expect(result.sections.map((s) => s.label)).toEqual([
      "Theme",
      "Var. 1 (transposed up a 5th)",
      "Var. 2 (inverted)",
      "Var. 3 (augmented)",
    ]);

    const themePitches = result.notes.slice(0, THEME.length).map((n) => n.pitch);
    const variation1Pitches = result.notes.slice(THEME.length, THEME.length * 2).map((n) => n.pitch);
    expect(variation1Pitches).toEqual(themePitches.map((p) => p + 7));
  });
});
