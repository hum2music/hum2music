import { describe, expect, test } from "bun:test";
import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { isConsonant } from "@hum2music/counterpoint";
import { composeEnsemble } from "@hum2music/orchestration";
import type { InstrumentDefinition } from "@hum2music/plugin-api";

const PIANO: InstrumentDefinition = { id: "piano", name: "Piano", family: "keyboard", pitchRange: { min: 21, max: 108 }, polyphony: 10 };
const VIOLIN: InstrumentDefinition = { id: "violin", name: "Violin", family: "strings", pitchRange: { min: 55, max: 103 }, polyphony: 1 };
const VIOLA: InstrumentDefinition = { id: "viola", name: "Viola", family: "strings", pitchRange: { min: 48, max: 91 }, polyphony: 1 };
const CELLO: InstrumentDefinition = { id: "cello", name: "Cello", family: "strings", pitchRange: { min: 36, max: 76 }, polyphony: 1 };

const MELODY: NoteEvent[] = [60, 62, 64, 65, 67, 65, 64, 62].map((pitch, i) => ({
  pitch,
  startBeat: i,
  durationBeats: 1,
  velocity: 90,
}));
const CHORDS: ChordEvent[] = [
  { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
  { symbol: "F", startBeat: 4, durationBeats: 4, confidence: 1 },
];

function stubChordalArranger(instrumentId: string, chords: ChordEvent[]): NoteEvent[] {
  // A trivial stand-in for "that instrument's own registered Arranger" — one whole-bar note per chord.
  return chords.map((chord) => ({ pitch: 48, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity: 70 }));
}

describe("composeEnsemble", () => {
  test("gives the melody instrument the input melody unchanged", async () => {
    const tracks = await composeEnsemble([VIOLIN, VIOLA, CELLO], { melody: MELODY, chords: CHORDS, arrangeChordal: stubChordalArranger });
    const melodyTrack = tracks.find((t) => t.role === "melody")!;
    expect(melodyTrack.instrumentId).toBe("violin");
    expect(melodyTrack.notes).toEqual(MELODY);
  });

  test("generates a real, consonant countermelody for countermelody-role instruments", async () => {
    const tracks = await composeEnsemble([VIOLIN, VIOLA, CELLO], { melody: MELODY, chords: CHORDS, arrangeChordal: stubChordalArranger });
    const countermelodyTracks = tracks.filter((t) => t.role === "countermelody");
    expect(countermelodyTracks.length).toBeGreaterThan(0);

    for (const track of countermelodyTracks) {
      expect(track.notes).toHaveLength(MELODY.length);
      track.notes.forEach((note, i) => {
        expect(isConsonant(MELODY[i].pitch, note.pitch)).toBe(true);
      });
    }
  });

  test("delegates harmony/bass roles to arrangeChordal", async () => {
    const tracks = await composeEnsemble([PIANO, VIOLIN, VIOLA, CELLO], {
      melody: MELODY,
      chords: CHORDS,
      arrangeChordal: stubChordalArranger,
    });

    const harmonyTrack = tracks.find((t) => t.role === "harmony")!;
    expect(harmonyTrack.instrumentId).toBe("piano");
    expect(harmonyTrack.notes).toHaveLength(CHORDS.length);
    expect(harmonyTrack.notes.every((n) => n.pitch === 48)).toBe(true);
  });

  test("produces exactly one track per instrument", async () => {
    const ensemble = [PIANO, VIOLIN, VIOLA, CELLO];
    const tracks = await composeEnsemble(ensemble, { melody: MELODY, chords: CHORDS, arrangeChordal: stubChordalArranger });
    expect(tracks).toHaveLength(ensemble.length);
  });

  test("handles an empty melody without throwing", async () => {
    const tracks = await composeEnsemble([VIOLIN, VIOLA], { melody: [], chords: CHORDS, arrangeChordal: stubChordalArranger });
    expect(tracks).toHaveLength(2);
  });
});
