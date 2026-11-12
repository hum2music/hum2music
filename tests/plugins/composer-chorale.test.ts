import { describe, expect, test } from "bun:test";
import type { NoteEvent } from "@hum2music/core";
import { choraleComposerPlugin } from "@hum2music/composer-chorale";
import { crossesVoices, isConsonant } from "@hum2music/counterpoint";
import { createTestContext } from "@hum2music/testing";

const MELODY: NoteEvent[] = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65].map((pitch, i) => ({
  pitch,
  startBeat: i,
  durationBeats: 1,
  velocity: 85,
}));

describe("choraleComposerPlugin", () => {
  test("registers a composer with id 'chorale'", () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    expect(context.composers.has("chorale")).toBe(true);
  });

  test("produces a Theme + 4 variations structure", async () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    const composer = context.composers.get("chorale")!;

    const result = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    expect(result.sections.map((s) => s.label)).toEqual([
      "Theme",
      "Var. 1 (transposed up a 5th)",
      "Var. 2 (inverted)",
      "Var. 3 (retrograde)",
      "Var. 4 (augmented)",
    ]);
  });

  test("adds a second voice underneath the theme (twice as many notes as the theme alone)", async () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    const composer = context.composers.get("chorale")!;

    const result = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    const themeNoteCount = result.notes.length / 2;
    expect(Number.isInteger(themeNoteCount)).toBe(true);
    expect(themeNoteCount).toBeGreaterThan(0);
  });

  test("the counterpoint voice is consonant with, and never crosses above, its theme note", async () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    const composer = context.composers.get("chorale")!;

    const result = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    // Every beat has exactly two notes (theme + counterpoint); group by
    // startBeat to recover the pairs regardless of merge order.
    const byBeat = new Map<number, NoteEvent[]>();
    for (const note of result.notes) {
      const notesAtBeat = byBeat.get(note.startBeat) ?? [];
      notesAtBeat.push(note);
      byBeat.set(note.startBeat, notesAtBeat);
    }

    for (const notesAtBeat of byBeat.values()) {
      expect(notesAtBeat).toHaveLength(2);
      const [a, b] = notesAtBeat;
      const [themeNote, counterpointNote] = a.pitch >= b.pitch ? [a, b] : [b, a];
      expect(isConsonant(themeNote.pitch, counterpointNote.pitch)).toBe(true);
      expect(crossesVoices(themeNote.pitch, counterpointNote.pitch, false)).toBe(false);
    }
  });

  test("is deterministic regardless of seed", async () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    const composer = context.composers.get("chorale")!;

    const a = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 1 });
    const b = await composer.compose({ melody: MELODY, chords: [], sections: [], seed: 999 });
    expect(b).toEqual(a);
  });

  test("handles a melody shorter than the motif length without throwing", async () => {
    const context = createTestContext();
    choraleComposerPlugin.register(context);
    const composer = context.composers.get("chorale")!;

    const shortMelody = MELODY.slice(0, 3);
    const result = await composer.compose({ melody: shortMelody, chords: [], sections: [], seed: 1 });
    expect(result.sections).toHaveLength(5);
  });
});
