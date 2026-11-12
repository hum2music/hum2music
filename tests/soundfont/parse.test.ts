import { describe, expect, test } from "bun:test";
import { buildMinimalSf2 } from "../../fixtures/soundfont";
import { parseSoundFont } from "@hum2music/soundfont";

function rampSample(length: number): Int16Array {
  const data = new Int16Array(length);
  for (let i = 0; i < length; i++) data[i] = i * 100;
  return data;
}

describe("parseSoundFont", () => {
  test("parses the one preset/instrument/sample a minimal SF2 declares", () => {
    const buffer = buildMinimalSf2({ sampleData: rampSample(100), programNumber: 5, bank: 0 });
    const sf = parseSoundFont(buffer);

    expect(sf.presets).toHaveLength(1);
    expect(sf.presets[0].presetNumber).toBe(5);
    expect(sf.presets[0].bank).toBe(0);
    expect(sf.presets[0].zones).toHaveLength(1);
    expect(sf.presets[0].zones[0].instrumentIndex).toBe(0);

    expect(sf.instruments).toHaveLength(1);
    expect(sf.instruments[0].zones).toHaveLength(1);
    expect(sf.instruments[0].zones[0].sampleIndex).toBe(0);

    expect(sf.samples).toHaveLength(1);
  });

  test("reads keyRange/velRange generators correctly", () => {
    const buffer = buildMinimalSf2({ sampleData: rampSample(100) });
    const sf = parseSoundFont(buffer);
    const zone = sf.instruments[0].zones[0];

    expect(zone.keyRangeLow).toBe(0);
    expect(zone.keyRangeHigh).toBe(127);
    expect(zone.velRangeLow).toBe(0);
    expect(zone.velRangeHigh).toBe(127);
  });

  test("reads the sample header's playback parameters correctly", () => {
    const buffer = buildMinimalSf2({
      sampleData: rampSample(100),
      sampleRate: 22050,
      originalPitch: 72,
      pitchCorrection: -15,
      startLoop: 10,
      endLoop: 90,
    });
    const sf = parseSoundFont(buffer);
    const sample = sf.samples[0];

    expect(sample.sampleRate).toBe(22050);
    expect(sample.originalPitch).toBe(72);
    expect(sample.pitchCorrection).toBe(-15);
    expect(sample.startLoop).toBe(10);
    expect(sample.endLoop).toBe(90);
    expect(sample.data).toHaveLength(100);
    // The raw sample data itself should be an exact copy, not resampled or shifted.
    expect(Array.from(sample.data.subarray(0, 3))).toEqual([0, 100, 200]);
  });

  test("reads pan/attenuation/sampleModes generators correctly", () => {
    const buffer = buildMinimalSf2({ sampleData: rampSample(50), pan: -250, initialAttenuation: 60, sampleModes: 1 });
    const sf = parseSoundFont(buffer);
    const zone = sf.instruments[0].zones[0];

    expect(zone.pan).toBe(-250);
    expect(zone.initialAttenuation).toBe(60);
    expect(zone.sampleModes).toBe(1);
  });

  test("rejects a buffer that isn't a RIFF/sfbk file", () => {
    const bogus = new TextEncoder().encode("not a soundfont at all, just text").buffer;
    expect(() => parseSoundFont(bogus)).toThrow(/Not a valid SoundFont2 file/);
  });
});
