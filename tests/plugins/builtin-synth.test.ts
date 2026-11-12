import { describe, expect, test } from "bun:test";
import { COMPOSITION_SCHEMA_VERSION, type PluginComposition } from "@hum2music/plugin-api";
import { builtinSynthRenderer } from "@hum2music/renderer-builtin-synth";

function composition(overrides: Partial<PluginComposition> = {}): PluginComposition {
  return {
    metadata: { schemaVersion: COMPOSITION_SCHEMA_VERSION, seed: 42, bpm: 120 },
    tracks: [],
    chords: [],
    sections: [],
    ...overrides,
  };
}

describe("builtinSynthRenderer", () => {
  test("renders a pitched instrument track to non-silent audio", async () => {
    const audio = await builtinSynthRenderer.render(
      composition({ tracks: [{ instrumentId: "piano", notes: [{ pitch: 60, startBeat: 0, durationBeats: 1, velocity: 100 }] }] }),
      { sampleRate: 44100 },
    );

    expect(audio.sampleRate).toBe(44100);
    expect(audio.channels).toBe(1);
    expect(audio.samples).toHaveLength(1);
    const peak = Math.max(...Array.from(audio.samples[0]).map(Math.abs));
    expect(peak).toBeGreaterThan(0);
  });

  test("routes a drums track through drum classification instead of pitched synthesis", async () => {
    const audio = await builtinSynthRenderer.render(
      composition({ tracks: [{ instrumentId: "drums", notes: [{ pitch: 36, startBeat: 0, durationBeats: 1, velocity: 100 }] }] }),
      { sampleRate: 44100, seed: 1 },
    );
    expect(Math.max(...Array.from(audio.samples[0]).map(Math.abs))).toBeGreaterThan(0);
  });

  test("falls back to the melody timbre (with a warning) for an unmapped instrument id", async () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      const audio = await builtinSynthRenderer.render(
        composition({
          tracks: [{ instrumentId: "harp", notes: [{ pitch: 48, startBeat: 0, durationBeats: 1, velocity: 100 }] }],
        }),
        {},
      );
      expect(Math.max(...Array.from(audio.samples[0]).map(Math.abs))).toBeGreaterThan(0);
      expect(warnings.some((args) => String(args[0]).includes("harp"))).toBe(true);
    } finally {
      console.warn = originalWarn;
    }
  });

  test("is deterministic for the same seed", async () => {
    const input = composition({ tracks: [{ instrumentId: "violin", notes: [{ pitch: 67, startBeat: 0, durationBeats: 2, velocity: 90 }] }] });
    const a = await builtinSynthRenderer.render(input, { seed: 3 });
    const b = await builtinSynthRenderer.render(input, { seed: 3 });
    expect(Array.from(b.samples[0])).toEqual(Array.from(a.samples[0]));
  });
});
