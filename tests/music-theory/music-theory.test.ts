import { describe, expect, test } from "bun:test";
import {
  chordPitchClasses,
  chordSymbol,
  isDiatonic,
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

describe("scalePitchClasses / isDiatonic", () => {
  test("C major scale contains only the white keys", () => {
    const scale = scalePitchClasses(0, "major");
    expect([...scale].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(isDiatonic(4, 0, "major")).toBe(true); // E
    expect(isDiatonic(3, 0, "major")).toBe(false); // D#
  });
});
