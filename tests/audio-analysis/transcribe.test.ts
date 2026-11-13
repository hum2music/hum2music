import { describe, expect, test } from "bun:test";
import { transcribeMelody } from "@hum2music/audio-analysis";
import { C_MAJOR_SCALE_HZ, C_MAJOR_SCALE_MIDI, generateScale, generateSilence, generateTone } from "../../fixtures/synth";

function centsToHz(baseHz: number, cents: number): number {
  return baseHz * 2 ** (cents / 1200);
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

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

  test("a brief blip shorter than the minimum note duration yields no notes", () => {
    const samples = concat([generateSilence(0.3, 44100), generateTone(261.63, 0.04, 44100), generateSilence(0.3, 44100)]);
    const notes = transcribeMelody(samples, 44100);
    expect(notes.length).toBe(0);
  });

  test("drops a non-vocal tone that recurs unusually precisely among naturally-jittered re-sung notes", () => {
    const naturalCents = [0, 12, -9, 15, -6];
    const interferenceCents = [0, 0.4, -0.3, 0.2];
    const parts: Float32Array[] = [generateSilence(0.1, 44100)];

    for (let i = 0; i < Math.max(naturalCents.length, interferenceCents.length); i++) {
      if (i < naturalCents.length) {
        parts.push(generateTone(centsToHz(261.63, naturalCents[i]), 0.3, 44100));
        parts.push(generateSilence(0.1, 44100));
      }
      if (i < interferenceCents.length) {
        parts.push(generateTone(centsToHz(698.46, interferenceCents[i]), 0.2, 44100));
        parts.push(generateSilence(0.1, 44100));
      }
    }

    const notes = transcribeMelody(concat(parts), 44100);

    expect(notes.length).toBe(naturalCents.length);
    expect(notes.every((note) => note.midiPitch === 60)).toBe(true);
  });
});
