import { describe, expect, test } from "bun:test";
import { decodeWav } from "@hum2music/audio-analysis";
// @ts-expect-error - plain browser JS module, not part of the TS project graph
import { downmixToMono, encodeWavPcm16 } from "../../apps/web/public/app.js";

describe("app.js audio helpers (importable outside the browser)", () => {
  test("encodeWavPcm16 round-trips through decodeWav", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buffer = encodeWavPcm16(samples, 44100);

    const decoded = decodeWav(buffer);
    expect(decoded.sampleRate).toBe(44100);
    expect(decoded.samples.length).toBe(samples.length);
    for (let i = 0; i < samples.length; i++) {
      expect(Math.abs(decoded.samples[i] - samples[i])).toBeLessThan(1e-4);
    }
  });

  test("downmixToMono averages multiple channels", () => {
    const fakeAudioBuffer = {
      numberOfChannels: 2,
      length: 3,
      getChannelData: (channel: number) => (channel === 0 ? new Float32Array([1, 1, 1]) : new Float32Array([-1, -1, -1])),
    };

    const mono = downmixToMono(fakeAudioBuffer);
    expect(Array.from(mono)).toEqual([0, 0, 0]);
  });

  test("does not touch the DOM when imported outside a browser", () => {
    expect(typeof document).toBe("undefined");
  });
});
