import { describe, expect, test } from "bun:test";
import { analyzeHarmony, estimateKey, estimateTempo, quantizeToBeats, type TimedNote } from "@hum2music/harmony";

function quarterNotes(pitches: number[], bpm = 120, velocity = 90): TimedNote[] {
  const msPerBeat = 60000 / bpm;
  return pitches.map((pitch, index) => ({
    pitch,
    startMs: index * msPerBeat,
    durationMs: msPerBeat,
    velocity,
  }));
}

describe("estimateTempo", () => {
  test("recovers the BPM of a steady quarter-note melody", () => {
    const notes = quarterNotes([60, 62, 64, 65, 67, 69, 71, 72], 120);
    const candidates = estimateTempo(notes);
    expect(candidates[0].bpm).toBe(120);
    expect(candidates[0].confidence).toBeCloseTo(1, 5);
  });
});

describe("quantizeToBeats", () => {
  test("snaps notes already on the grid with zero timing offset", () => {
    const notes = quarterNotes([60, 62, 64, 65], 120);
    const quantized = quantizeToBeats(notes, 120);

    expect(quantized.map((n) => n.startBeat)).toEqual([0, 1, 2, 3]);
    expect(quantized.map((n) => n.durationBeats)).toEqual([1, 1, 1, 1]);
    for (const note of quantized) {
      expect(note.expression?.timingOffsetMs).toBeCloseTo(0, 5);
    }
  });
});

describe("estimateKey", () => {
  test("ranks C major highest for a C major scale", () => {
    const notes = quarterNotes([60, 62, 64, 65, 67, 69, 71, 72], 120);
    const candidates = estimateKey(notes);
    expect(candidates[0].tonic).toBe("C");
    expect(candidates[0].mode).toBe("major");
  });
});

describe("analyzeHarmony", () => {
  test("recovers a known I-IV-V-I progression from an arpeggiated melody", () => {
    // Each bar arpeggiates the triad of its intended chord, one quarter note
    // per beat at 120 BPM (4 beats/bar), over a known C-F-G-C progression.
    const pitches = [
      60, 64, 67, 72, // bar 0: C E G C  -> C
      65, 69, 72, 77, // bar 1: F A C F  -> F
      67, 71, 74, 79, // bar 2: G B D G  -> G
      60, 64, 67, 72, // bar 3: C E G C  -> C
    ];
    const notes = quarterNotes(pitches, 120);

    const analysis = analyzeHarmony(notes);

    expect(analysis.selectedBpm).toBe(120);
    expect(analysis.chords).toHaveLength(4);
    expect(analysis.chords.map((c) => c.symbol)).toEqual(["C", "F", "G", "C"]);
    for (const chord of analysis.chords) {
      expect(chord.confidence).toBeCloseTo(1, 5);
    }
  });

  test("is deterministic for the same input", () => {
    const notes = quarterNotes([60, 64, 67, 72, 65, 69, 72, 77], 120);
    const first = analyzeHarmony(notes);
    const second = analyzeHarmony(notes);
    expect(second).toEqual(first);
  });
});
