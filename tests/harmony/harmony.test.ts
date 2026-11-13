import { describe, expect, test } from "bun:test";
import {
  analyzeHarmony,
  estimateKey,
  estimateTempo,
  quantizeToBeats,
  selectPreferredTempo,
  type TimedNote,
} from "@hum2music/harmony";

function quarterNotes(pitches: number[], bpm = 120, velocity = 90): TimedNote[] {
  const msPerBeat = 60000 / bpm;
  return pitches.map((pitch, index) => ({
    pitch,
    startMs: index * msPerBeat,
    durationMs: msPerBeat,
    velocity,
  }));
}

/** Eighth-eighth-quarter repeated, at a 120 BPM quarter-note pulse: more eighth-note onsets than quarter-note ones, like a real melody. */
function eighthEighthQuarterNotes(groupCount: number, bpm = 120): TimedNote[] {
  const quarterMs = 60000 / bpm;
  const eighthMs = quarterMs / 2;
  const notes: TimedNote[] = [];
  let timeMs = 0;
  for (let group = 0; group < groupCount; group++) {
    notes.push({ pitch: 60, startMs: timeMs, durationMs: eighthMs, velocity: 90 });
    timeMs += eighthMs;
    notes.push({ pitch: 62, startMs: timeMs, durationMs: eighthMs, velocity: 90 });
    timeMs += eighthMs;
    notes.push({ pitch: 64, startMs: timeMs, durationMs: quarterMs, velocity: 90 });
    timeMs += quarterMs;
  }
  return notes;
}

describe("estimateTempo", () => {
  test("recovers the BPM of a steady quarter-note melody", () => {
    const notes = quarterNotes([60, 62, 64, 65, 67, 69, 71, 72], 120);
    const candidates = estimateTempo(notes);
    expect(candidates[0].bpm).toBe(120);
    expect(candidates[0].confidence).toBeCloseTo(1, 5);
  });

  test("the raw histogram's top candidate is the eighth-note rate for a mixed-rhythm melody", () => {
    const notes = eighthEighthQuarterNotes(6, 120);
    const candidates = estimateTempo(notes);
    expect(candidates[0].bpm).toBe(240);
  });
});

describe("selectPreferredTempo", () => {
  test("folds the fastest candidate down to a still-plausible half-tempo relative", () => {
    const notes = eighthEighthQuarterNotes(6, 120);
    const candidates = estimateTempo(notes);
    expect(selectPreferredTempo(candidates)).toBe(120);
  });

  test("keeps a steady quarter-note melody's tempo unchanged (no half candidate exists)", () => {
    const notes = quarterNotes([60, 62, 64, 65, 67, 69, 71, 72], 120);
    const candidates = estimateTempo(notes);
    expect(selectPreferredTempo(candidates)).toBe(120);
  });

  test("keeps the fastest candidate when its half-tempo relative is too rare to trust", () => {
    const candidates = [
      { bpm: 240, confidence: 0.9 },
      { bpm: 120, confidence: 0.05 }, // well under the 0.3 confidence-ratio floor
    ];
    expect(selectPreferredTempo(candidates)).toBe(240);
  });

  test("returns undefined for an empty candidate list", () => {
    expect(selectPreferredTempo([])).toBeUndefined();
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
