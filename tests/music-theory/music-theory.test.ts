import { describe, expect, test } from "bun:test";
import {
  CHORD_QUALITIES,
  chordPitchClasses,
  chordSymbol,
  isDiatonic,
  parseChordSymbol,
  pitchClassDistance,
  pitchClassOf,
  scalePitchClasses,
} from "@hum2music/music-theory";

describe("pitchClassOf", () => {
  test("wraps MIDI note numbers into 0-11", () => {
    expect(pitchClassOf(60)).toBe(0); // C4
    expect(pitchClassOf(61)).toBe(1); // C#4
    expect(pitchClassOf(-1)).toBe(11);
  });
});

describe("pitchClassDistance", () => {
  test("is signed and wraps around the octave", () => {
    expect(pitchClassDistance(0, 4)).toBe(4);
    expect(pitchClassDistance(0, 8)).toBe(-4);
    expect(pitchClassDistance(0, 6)).toBe(6);
  });
});

describe("chordPitchClasses / chordSymbol", () => {
  test("C major triad", () => {
    expect(chordPitchClasses(0, "major").sort((a, b) => a - b)).toEqual([0, 4, 7]);
    expect(chordSymbol(0, "major")).toBe("C");
  });

  test("A minor triad", () => {
    expect(chordPitchClasses(9, "minor").sort((a, b) => a - b)).toEqual([0, 4, 9]);
    expect(chordSymbol(9, "minor")).toBe("Am");
  });

  test("G dominant 7th", () => {
    expect(chordPitchClasses(7, "dominant7").sort((a, b) => a - b)).toEqual([2, 5, 7, 11]);
    expect(chordSymbol(7, "dominant7")).toBe("G7");
  });
});

describe("parseChordSymbol", () => {
  test("is the exact inverse of chordSymbol for every root/quality", () => {
    for (let root = 0; root < 12; root++) {
      for (const quality of CHORD_QUALITIES) {
        const symbol = chordSymbol(root, quality);
        expect(parseChordSymbol(symbol)).toEqual({ root, quality });
      }
    }
  });

  test("handles flats, sharps, and minor7 vs. minor correctly", () => {
    expect(parseChordSymbol("Bb")).toEqual({ root: 10, quality: "major" });
    expect(parseChordSymbol("F#m")).toEqual({ root: 6, quality: "minor" });
    expect(parseChordSymbol("Dm7")).toEqual({ root: 2, quality: "minor7" });
    expect(parseChordSymbol("Cmaj7")).toEqual({ root: 0, quality: "major7" });
  });

  test("returns null for an unparseable symbol", () => {
    expect(parseChordSymbol("Hm")).toBeNull();
    expect(parseChordSymbol("Cadd9")).toBeNull();
  });
});

describe("scalePitchClasses / isDiatonic", () => {
  test("C major scale contains only the white keys", () => {
    const scale = scalePitchClasses(0, "major");
    expect([...scale].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(isDiatonic(4, 0, "major")).toBe(true); // E
    expect(isDiatonic(3, 0, "major")).toBe(false); // D#
  });
});
