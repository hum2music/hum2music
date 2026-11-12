import { describe, expect, test } from "bun:test";
import { classifyDrumNote, renderToSamples } from "@hum2music/rendering";

describe("classifyDrumNote", () => {
  test("maps the GM percussion notes our drum arranger emits", () => {
    expect(classifyDrumNote(36)).toBe("kick");
    expect(classifyDrumNote(38)).toBe("snare");
    expect(classifyDrumNote(42)).toBe("hihat");
  });

  test("falls back to hihat for an unrecognized pitch", () => {
    expect(classifyDrumNote(99)).toBe("hihat");
  });
});

describe("renderToSamples", () => {
  test("produces non-silent output covering the full duration plus tail", () => {
    const samples = renderToSamples(
      [{ startMs: 0, durationMs: 500, velocity: 100, frequencyHz: 440 }],
      [],
      { sampleRate: 44100 },
    );

    expect(samples.length).toBeGreaterThan((0.5 * 44100) | 0);
    const peak = Math.max(...Array.from(samples).map(Math.abs));
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(1);
  });

  test("is deterministic for the same seed (drum noise included)", () => {
    const drumNotes = [{ startMs: 0, durationMs: 150, velocity: 100, drumType: "snare" as const }];
    const a = renderToSamples([], drumNotes, { seed: 7 });
    const b = renderToSamples([], drumNotes, { seed: 7 });
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  test("differs for different seeds when drums are present", () => {
    const drumNotes = [{ startMs: 0, durationMs: 150, velocity: 100, drumType: "hihat" as const }];
    const a = renderToSamples([], drumNotes, { seed: 1 });
    const b = renderToSamples([], drumNotes, { seed: 2 });
    expect(Array.from(b)).not.toEqual(Array.from(a));
  });

  test("returns a near-silent buffer for no notes", () => {
    const samples = renderToSamples([], [], {});
    expect(samples.length).toBeGreaterThan(0);
    expect(Math.max(...Array.from(samples).map(Math.abs))).toBe(0);
  });

  test("different timbres produce audibly different waveforms for the same note", () => {
    const note = { startMs: 0, durationMs: 300, velocity: 100, frequencyHz: 220 };
    const melody = renderToSamples([{ ...note, timbre: "melody" }], [], {});
    const piano = renderToSamples([{ ...note, timbre: "piano" }], [], {});
    const bass = renderToSamples([{ ...note, timbre: "bass" }], [], {});
    const guitar = renderToSamples([{ ...note, timbre: "guitar" }], [], {});

    expect(Array.from(piano)).not.toEqual(Array.from(melody));
    expect(Array.from(bass)).not.toEqual(Array.from(melody));
    expect(Array.from(guitar)).not.toEqual(Array.from(melody));
    expect(Array.from(piano)).not.toEqual(Array.from(guitar));
  });

  test("violin timbre differs from the other sustained timbres", () => {
    const note = { startMs: 0, durationMs: 300, velocity: 100, frequencyHz: 220 };
    const melody = renderToSamples([{ ...note, timbre: "melody" }], [], {});
    const bass = renderToSamples([{ ...note, timbre: "bass" }], [], {});
    const violin = renderToSamples([{ ...note, timbre: "violin" }], [], {});

    expect(Array.from(violin)).not.toEqual(Array.from(melody));
    expect(Array.from(violin)).not.toEqual(Array.from(bass));
  });

  test("viola and cello each differ from each other and from the violin", () => {
    const note = { startMs: 0, durationMs: 300, velocity: 100, frequencyHz: 220 };
    const violin = renderToSamples([{ ...note, timbre: "violin" }], [], {});
    const viola = renderToSamples([{ ...note, timbre: "viola" }], [], {});
    const cello = renderToSamples([{ ...note, timbre: "cello" }], [], {});

    expect(Array.from(viola)).not.toEqual(Array.from(violin));
    expect(Array.from(cello)).not.toEqual(Array.from(violin));
    expect(Array.from(cello)).not.toEqual(Array.from(viola));
  });

  test("defaults to the melody timbre when none is given", () => {
    const note = { startMs: 0, durationMs: 300, velocity: 100, frequencyHz: 220 };
    const withDefault = renderToSamples([note], [], {});
    const withExplicitMelody = renderToSamples([{ ...note, timbre: "melody" as const }], [], {});
    expect(Array.from(withDefault)).toEqual(Array.from(withExplicitMelody));
  });
});
