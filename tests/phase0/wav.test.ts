import { describe, expect, test } from "bun:test";
import { decodeWav } from "@hum2music/audio-analysis";
import { encodeWavPcm16, generateTone } from "../../fixtures/synth";

describe("decodeWav", () => {
  test("round-trips mono PCM16 samples", () => {
    const original = generateTone(440, 0.05, 44100);
    const buffer = encodeWavPcm16(original, 44100);

    const { sampleRate, samples } = decodeWav(buffer);

    expect(sampleRate).toBe(44100);
    expect(samples.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(Math.abs(samples[i] - original[i])).toBeLessThan(1e-4);
    }
  });

  test("downmixes stereo to mono by averaging channels", () => {
    const sampleRate = 44100;
    const left = new Float32Array([1, -1, 0.5]);
    const right = new Float32Array([-1, 1, 0.5]);
    const buffer = encodeStereoPcm16(left, right, sampleRate);

    const { samples } = decodeWav(buffer);

    expect(samples.length).toBe(3);
    expect(samples[0]).toBeCloseTo(0, 2);
    expect(samples[1]).toBeCloseTo(0, 2);
    expect(samples[2]).toBeCloseTo(0.5, 2);
  });

  test("rejects non-PCM formats", () => {
    const buffer = encodeWavPcm16(generateTone(440, 0.01, 44100), 44100);
    const view = new DataView(buffer);
    view.setUint16(20, 3, true); // IEEE float marker
    expect(() => decodeWav(buffer)).toThrow();
  });
});

function encodeStereoPcm16(left: Float32Array, right: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = left.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < left.length; i++) {
    view.setInt16(44 + i * 4, Math.round(left[i] * 32767), true);
    view.setInt16(44 + i * 4 + 2, Math.round(right[i] * 32767), true);
  }

  return buffer;
}
