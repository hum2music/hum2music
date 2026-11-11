import { describe, expect, test } from "bun:test";
import { transcribeMelody } from "@hum2music/audio-analysis";
import { C_MAJOR_SCALE_HZ, C_MAJOR_SCALE_MIDI, generateScale, generateTone } from "../../fixtures/synth";

describe("transcribeMelody", () => {
  test("segments a C major scale into 8 correctly pitched notes, in order", () => {
    const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
    const notes = transcribeMelody(samples, 44100);

    expect(notes.length).toBe(C_MAJOR_SCALE_MIDI.length);
    notes.forEach((note, index) => {
      expect(note.midiPitch).toBe(C_MAJOR_SCALE_MIDI[index]);
    });
  });

  test("notes appear in increasing, non-overlapping time order", () => {
    const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
    const notes = transcribeMelody(samples, 44100);

    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].startMs).toBeGreaterThan(notes[i - 1].startMs);
    }
  });

  test("is deterministic for the same input", () => {
    const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
    const first = transcribeMelody(samples, 44100);
    const second = transcribeMelody(samples, 44100);
    expect(second).toEqual(first);
  });

  test("a single sustained tone yields a single note", () => {
    const samples = generateTone(261.63, 0.5, 44100);
    const notes = transcribeMelody(samples, 44100);
    expect(notes.length).toBe(1);
    expect(notes[0].midiPitch).toBe(60);
  });
});
