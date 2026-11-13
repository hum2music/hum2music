import { describe, expect, test } from "bun:test";
import { rejectInvariantTones, type TranscribedNote } from "@hum2music/audio-analysis";

function note(midiPitch: number, rawPitch: number, startMs: number): TranscribedNote {
  return { midiPitch, rawPitch, startMs, durationMs: 150, velocity: 90, confidence: 0.9 };
}

describe("rejectInvariantTones", () => {
  test("drops a pitch that recurs unusually often and unusually precisely next to a naturally-jittered one", () => {
    // A human re-singing "the same" note drifts a few cents take to take.
    const naturalJitterCents = [0, 12, -9, 15, -6, 8];
    const naturalNotes = naturalJitterCents.map((cents, i) => note(60, 60 + cents / 100, i * 1000));

    // A non-vocal tone bleeding into the recording lands on almost exactly
    // the same Hz every time.
    const invariantJitterCents = [0, 0.5, -0.3, 0.2, -0.4];
    const invariantNotes = invariantJitterCents.map((cents, i) => note(77, 77 + cents / 100, i * 1000 + 500));

    const result = rejectInvariantTones([...naturalNotes, ...invariantNotes]);

    expect(result.every((n) => n.midiPitch !== 77)).toBe(true);
    expect(result.length).toBe(naturalNotes.length);
  });

  test("keeps everything when only one pitch repeats often enough to judge", () => {
    const notes = [0, 1, 2, 3, 4].map((i) => note(60, 60, i * 1000));
    expect(rejectInvariantTones(notes)).toEqual(notes);
  });

  test("keeps everything when recurring pitches are comparably stable (no outlier to flag)", () => {
    const a = [0, 10, -8, 12].map((cents, i) => note(60, 60 + cents / 100, i * 1000));
    const b = [0, -9, 11, -7].map((cents, i) => note(65, 65 + cents / 100, i * 1000 + 500));
    const notes = [...a, ...b];
    expect(rejectInvariantTones(notes)).toEqual(notes);
  });

  test("ignores a pitch that repeats fewer times than minOccurrences", () => {
    const stable = [0, 1, -1].map((cents, i) => note(77, 77 + cents / 100, i * 1000)); // only 3 occurrences
    const natural = [0, 15, -12, 10, -8].map((cents, i) => note(60, 60 + cents / 100, i * 1000 + 500));
    const result = rejectInvariantTones([...stable, ...natural], { minOccurrences: 4 });
    expect(result.length).toBe(stable.length + natural.length);
  });

  test("does not mutate the input array", () => {
    const notes = [0, 1, 2, 3].map((i) => note(60, 60, i * 1000));
    const copy = [...notes];
    rejectInvariantTones(notes);
    expect(notes).toEqual(copy);
  });
});
