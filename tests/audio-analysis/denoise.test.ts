import { describe, expect, test } from "bun:test";
import { reduceNoise } from "@hum2music/audio-analysis";
import { generateSilence, generateTone } from "../../fixtures/synth";

const SAMPLE_RATE = 44100;

function addDeterministicNoise(samples: Float32Array, amplitude: number): Float32Array {
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const pseudoRandom = Math.sin(i * 12.9898) * 43758.5453;
    const noise = (pseudoRandom - Math.floor(pseudoRandom)) * 2 - 1;
    output[i] = samples[i] + noise * amplitude;
  }
  return output;
}

describe("reduceNoise", () => {
  test("removes DC offset via the high-pass filter", () => {
    const offsetSamples = new Float32Array(SAMPLE_RATE / 2).fill(0.3);
    const output = reduceNoise(offsetSamples, SAMPLE_RATE);

    const mean = output.reduce((sum, v) => sum + v, 0) / output.length;
    expect(Math.abs(mean)).toBeLessThan(0.01);
  });

  test("attenuates a noise-only passage more than a loud tone passage", () => {
    const quietNoise = addDeterministicNoise(generateSilence(0.3, SAMPLE_RATE), 0.01);
    const loudTone = addDeterministicNoise(generateTone(440, 0.3, SAMPLE_RATE, 0.5), 0.01);
    const samples = new Float32Array(quietNoise.length + loudTone.length);
    samples.set(quietNoise, 0);
    samples.set(loudTone, quietNoise.length);

    const output = reduceNoise(samples, SAMPLE_RATE);

    const rms = (values: Float32Array) => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
    const quietRms = rms(output.slice(0, quietNoise.length));
    const loudRms = rms(output.slice(quietNoise.length));

    expect(loudRms).toBeGreaterThan(quietRms * 5);
  });

  test("is deterministic for identical input", () => {
    const samples = addDeterministicNoise(generateTone(330, 0.2, SAMPLE_RATE, 0.4), 0.02);
    const first = reduceNoise(samples, SAMPLE_RATE);
    const second = reduceNoise(samples, SAMPLE_RATE);
    expect(second).toEqual(first);
  });

  test("does not change the length of the signal", () => {
    const samples = generateTone(220, 0.1, SAMPLE_RATE);
    const output = reduceNoise(samples, SAMPLE_RATE);
    expect(output.length).toBe(samples.length);
  });

  test("handles an empty input without throwing", () => {
    const output = reduceNoise(new Float32Array(0), SAMPLE_RATE);
    expect(output.length).toBe(0);
  });
});
