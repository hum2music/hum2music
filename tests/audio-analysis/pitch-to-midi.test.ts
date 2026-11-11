import { describe, expect, test } from "bun:test";
import { frequencyToMidiNote, midiNoteToFrequency } from "@hum2music/audio-analysis";

describe("frequencyToMidiNote", () => {
  test("A4 (440Hz) maps to MIDI 69", () => {
    expect(frequencyToMidiNote(440)).toBeCloseTo(69, 6);
  });

  test("C4 (261.6256Hz) maps to MIDI 60", () => {
    expect(frequencyToMidiNote(261.6256)).toBeCloseTo(60, 2);
  });

  test("preserves fractional cents deviation", () => {
    const quarterToneSharp = 440 * Math.pow(2, 0.5 / 12);
    expect(frequencyToMidiNote(quarterToneSharp)).toBeCloseTo(69.5, 6);
  });
});

describe("midiNoteToFrequency", () => {
  test("is the inverse of frequencyToMidiNote", () => {
    for (const freq of [110, 261.6256, 440, 523.25, 880]) {
      expect(midiNoteToFrequency(frequencyToMidiNote(freq))).toBeCloseTo(freq, 3);
    }
  });
});
