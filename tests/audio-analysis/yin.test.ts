import { describe, expect, test } from "bun:test";
import { detectPitchYin, selectTauEstimate } from "@hum2music/audio-analysis";
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

describe("selectTauEstimate", () => {
  test("prefers the deepest dip over the first dip below threshold", () => {
    // Shape observed in a real humming recording: a shallow dip at a short
    // tau (a strong harmonic, here ~762Hz) crosses threshold before the
    // frame's true, much deeper dip at a longer tau (the actual fundamental,
    // ~92.5Hz). Picking the first dip found instead of the deepest one
    // reported the harmonic as the pitch — an octave-too-high error.
    const tauMax = 200;
    const cmndf = new Float64Array(tauMax + 1).fill(1);
    cmndf[20] = 0.3;
    cmndf[21] = 0.1044;
    cmndf[22] = 0.3;
    cmndf[172] = 0.3;
    cmndf[173] = 0.0527;
    cmndf[174] = 0.3;

    const tau = selectTauEstimate(cmndf, 16, tauMax, 0.12);
    expect(tau).toBe(173);
  });

  test("still prefers the smallest tau among near-tied dips (avoids an octave-too-low pick)", () => {
    // A pure tone is exactly periodic at its fundamental period and at every
    // integer multiple of it, so floating-point noise can make a longer-tau
    // multiple look marginally deeper than the true (shorter-tau)
    // fundamental. Dips this close together should still resolve to the
    // smallest tau.
    const tauMax = 100;
    const cmndf = new Float64Array(tauMax + 1).fill(1);
    cmndf[29] = 0.0001;
    cmndf[59] = 0.0;

    const tau = selectTauEstimate(cmndf, 10, tauMax, 0.12);
    expect(tau).toBe(29);
  });

  test("returns -1 when nothing dips below threshold", () => {
    const tauMax = 50;
    const cmndf = new Float64Array(tauMax + 1).fill(1);
    expect(selectTauEstimate(cmndf, 10, tauMax, 0.12)).toBe(-1);
  });
});
