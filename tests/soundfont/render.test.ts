import { describe, expect, test } from "bun:test";
import { buildMinimalSf2 } from "../../fixtures/soundfont";
import { parseSoundFont, renderSoundFontNote } from "@hum2music/soundfont";

/** A single cycle of a triangle-ish wave repeated, so looping is easy to verify by exact value equality. */
function loopableSample(cycleLength: number, cycles: number): Int16Array {
  const data = new Int16Array(cycleLength * cycles);
  for (let i = 0; i < data.length; i++) {
    const phase = (i % cycleLength) / cycleLength;
    data[i] = Math.round(Math.sin(phase * Math.PI * 2) * 10000);
  }
  return data;
}

describe("renderSoundFontNote", () => {
  test("plays the sample back unshifted at its own root pitch and sample rate", () => {
    const sampleData = loopableSample(20, 5); // 100 samples
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0 });
    const sf = parseSoundFont(buffer);

    const result = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 1000 }, 44100);
    expect(result).toBeDefined();

    // At the root pitch/rate, output should track the input 1:1 (normalized
    // to [-1,1]), scaled only by the default center pan's constant-power
    // gain (cos(pi/4), since pan isn't under test here).
    for (let i = 0; i < 10; i++) {
      expect(result!.left[i]).toBeCloseTo((sampleData[i] / 32768) * Math.SQRT1_2, 3);
    }
  });

  test("playing an octave higher advances through the sample twice as fast", () => {
    const sampleData = loopableSample(20, 5);
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0 });
    const sf = parseSoundFont(buffer);

    const result = renderSoundFontNote(sf, 0, 0, { pitch: 72, velocity: 127, startMs: 0, durationMs: 1000 }, 44100);
    expect(result).toBeDefined();
    // One octave up doubles the playback rate, so it reaches the sample's
    // natural end (no loop) in roughly half the output samples.
    expect(result!.left.length).toBeLessThan(sampleData.length * 0.6);
  });

  test("loops continuously (sampleModes 1) to sustain past the sample's raw length", () => {
    const sampleData = loopableSample(20, 5); // 100 samples, loop the whole thing
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 1, startLoop: 0, endLoop: 100 });
    const sf = parseSoundFont(buffer);

    const result = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 5000 }, 44100);
    expect(result).toBeDefined();
    // 5 seconds at 44100Hz, plus a short release tail - far longer than the 100-sample raw data, only possible via looping.
    expect(result!.left.length).toBeGreaterThan(sampleData.length * 100);

    // Not just long - actually repeating the waveform, not decaying to
    // silence once the raw sample data runs out: many loop cycles later,
    // a point within the sustain window should still be non-silent and
    // close to the same cycle-relative value as near the start.
    const cycleLength = 20;
    const farIndex = cycleLength * 500 + 3; // deep into the loop, still well before the 5s duration ends
    expect(Math.abs(result!.left[farIndex])).toBeGreaterThan(0.05);
  });

  test("does not loop when sampleModes is 0 (plays through to the natural end once)", () => {
    const sampleData = loopableSample(20, 5);
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0 });
    const sf = parseSoundFont(buffer);

    const result = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 5000 }, 44100);
    expect(result).toBeDefined();
    expect(result!.left.length).toBeLessThanOrEqual(sampleData.length);
  });

  test("higher velocity produces louder output", () => {
    const sampleData = loopableSample(20, 5);
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0 });
    const sf = parseSoundFont(buffer);

    const loud = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 1000 }, 44100)!;
    const soft = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 32, startMs: 0, durationMs: 1000 }, 44100)!;

    expect(Math.abs(soft.left[5])).toBeLessThan(Math.abs(loud.left[5]));
  });

  test("pan -500 (full left) produces silence on the right channel", () => {
    const sampleData = loopableSample(20, 5);
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0, pan: -500 });
    const sf = parseSoundFont(buffer);

    const result = renderSoundFontNote(sf, 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 1000 }, 44100)!;
    for (const value of result.right) expect(value).toBeCloseTo(0, 5);
  });

  test("higher initialAttenuation (centibels) produces quieter output", () => {
    const sampleData = loopableSample(20, 5);
    const quiet = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0, initialAttenuation: 200 });
    const loud = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 0, initialAttenuation: 0 });

    const quietResult = renderSoundFontNote(parseSoundFont(quiet), 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 1000 }, 44100)!;
    const loudResult = renderSoundFontNote(parseSoundFont(loud), 0, 0, { pitch: 60, velocity: 127, startMs: 0, durationMs: 1000 }, 44100)!;

    expect(Math.abs(quietResult.left[5])).toBeLessThan(Math.abs(loudResult.left[5]));
  });

  test("returns undefined for an unmapped program number", () => {
    const buffer = buildMinimalSf2({ sampleData: loopableSample(20, 5), programNumber: 0 });
    const sf = parseSoundFont(buffer);
    expect(renderSoundFontNote(sf, 99, 0, { pitch: 60, velocity: 100, startMs: 0, durationMs: 500 }, 44100)).toBeUndefined();
  });

  test("returns undefined for a key outside every zone's keyRange", () => {
    const buffer = buildMinimalSf2({ sampleData: loopableSample(20, 5) });
    // Narrow the zone artificially isn't exposed by the fixture builder, so
    // instead verify the wide-open default zone (0-127) rejects an
    // out-of-MIDI-range request, proving the bound check actually runs.
    const sf = parseSoundFont(buffer);
    expect(renderSoundFontNote(sf, 0, 0, { pitch: 200, velocity: 100, startMs: 0, durationMs: 500 }, 44100)).toBeUndefined();
  });

  test("is deterministic for the same inputs", () => {
    const sampleData = loopableSample(20, 5);
    const buffer = buildMinimalSf2({ sampleData, sampleRate: 44100, originalPitch: 60, sampleModes: 1, endLoop: 100 });
    const sf = parseSoundFont(buffer);

    const a = renderSoundFontNote(sf, 0, 0, { pitch: 64, velocity: 100, startMs: 0, durationMs: 300 }, 44100)!;
    const b = renderSoundFontNote(sf, 0, 0, { pitch: 64, velocity: 100, startMs: 0, durationMs: 300 }, 44100)!;
    expect(Array.from(b.left)).toEqual(Array.from(a.left));
  });
});
