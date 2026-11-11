import { describe, expect, test } from "bun:test";
import { detectPitchYin } from "@hum2music/audio-analysis";
import { generateSilence, generateTone, generateVibratoTone } from "../../fixtures/synth";

describe("detectPitchYin", () => {
  test("detects a steady 440Hz tone within 15 cents", () => {
    const samples = generateTone(440, 0.5, 44100);
    const frames = detectPitchYin(samples, 44100);

    const voiced = frames.filter((f) => f.voiced && f.f0Hz !== null);
    expect(voiced.length).toBeGreaterThan(0);

    const middle = voiced[Math.floor(voiced.length / 2)];
    const cents = 1200 * Math.log2((middle.f0Hz as number) / 440);
    expect(Math.abs(cents)).toBeLessThan(15);
  });

  test("marks silence as unvoiced", () => {
    const samples = generateSilence(0.2, 44100);
    const frames = detectPitchYin(samples, 44100);

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(frame.voiced).toBe(false);
      expect(frame.f0Hz).toBeNull();
    }
  });

  test("tracks a vibrato tone around its center frequency", () => {
    const samples = generateVibratoTone(293.66, 1.0, 5.5, 25, 44100);
    const frames = detectPitchYin(samples, 44100);
    const voiced = frames.filter((f) => f.voiced && f.f0Hz !== null) as { f0Hz: number }[];

    expect(voiced.length).toBeGreaterThan(10);
    const average = voiced.reduce((sum, f) => sum + f.f0Hz, 0) / voiced.length;
    const centsFromCenter = 1200 * Math.log2(average / 293.66);
    expect(Math.abs(centsFromCenter)).toBeLessThan(10);
  });
});
