import { describe, expect, test } from "bun:test";
import type { NoteEvent } from "@hum2music/core";
import { motifDevelopmentComposerPlugin } from "@hum2music/composer-motif-development";
import { createTestContext } from "@hum2music/testing";

const MELODY: NoteEvent[] = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65].map((pitch, i) => ({
  pitch,
  startBeat: i,
  durationBeats: 1,
  velocity: 85,
}));

describe("motifDevelopmentComposerPlugin", () => {
  test("registers a composer with id 'motif-development'", () => {
    const context = createTestContext();
    motifDevelopmentComposerPlugin.register(context);
    expect(context.composers.has("motif-development")).toBe(true);
  });

  test("produces a Theme + 4 variations structure", async () => {
    const context = createTestContext();
    motifDevelopmentComposerPlugin.register(context);
    const composer = context.composers.get("motif-development")!;

    const result = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    expect(result.sections.map((s) => s.label)).toEqual([
      "Theme",
      "Var. 1 (transposed up a 5th)",
      "Var. 2 (inverted)",
      "Var. 3 (retrograde)",
      "Var. 4 (augmented)",
    ]);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  test("is deterministic regardless of seed", async () => {
    const context = createTestContext();
    motifDevelopmentComposerPlugin.register(context);
    const composer = context.composers.get("motif-development")!;

    const a = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    const b = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 999 });
    expect(b).toEqual(a);
  });

  test("handles a melody shorter than the motif length without throwing", async () => {
    const context = createTestContext();
    motifDevelopmentComposerPlugin.register(context);
    const composer = context.composers.get("motif-development")!;

    const shortMelody = MELODY.slice(0, 3);
    const result = await composer.compose({ melody: shortMelody, chords: [], sections: [], seed: 1 });
    expect(result.sections).toHaveLength(5);
  });
});
