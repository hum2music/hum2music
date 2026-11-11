import type { NoteEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { noteEventsToMidiNotes } from "@hum2music/midi";

describe("noteEventsToMidiNotes", () => {
  test("converts beats to ms using the given bpm", () => {
    const notes: NoteEvent[] = [{ pitch: 60, startBeat: 2, durationBeats: 1, velocity: 90 }];
    const [result] = noteEventsToMidiNotes(notes, 120); // 500ms per beat

    expect(result.startMs).toBe(1000);
    expect(result.durationMs).toBe(500);
    expect(result.pitch).toBe(60);
    expect(result.velocity).toBe(90);
  });

  test("adds expression.timingOffsetMs on top of the grid position", () => {
    const notes: NoteEvent[] = [
      { pitch: 60, startBeat: 1, durationBeats: 1, velocity: 90, expression: { timingOffsetMs: 15 } },
    ];
    const [result] = noteEventsToMidiNotes(notes, 120);
    expect(result.startMs).toBe(500 + 15);
  });

  test("passes through the pitch curve unchanged", () => {
    const notes: NoteEvent[] = [
      {
        pitch: 60,
        startBeat: 0,
        durationBeats: 1,
        velocity: 90,
        expression: { pitchCurve: [{ offsetMs: 0, cents: 10 }] },
      },
    ];
    const [result] = noteEventsToMidiNotes(notes, 120);
    expect(result.pitchCurve).toEqual([{ offsetMs: 0, cents: 10 }]);
  });
});
