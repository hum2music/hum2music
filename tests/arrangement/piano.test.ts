import type { ChordEvent } from "@hum2music/core";
import { describe, expect, test } from "bun:test";
import { generatePianoArrangement } from "@hum2music/arrangement";
import { pitchClassOf } from "@hum2music/music-theory";

function chord(symbol: string, startBeat: number): ChordEvent {
  return { symbol, startBeat, durationBeats: 4, confidence: 1 };
}

describe("generatePianoArrangement", () => {
  test("each bar's voicing contains exactly the chord's tones, within piano range", () => {
    const chords = [chord("C", 0), chord("F", 4), chord("G", 8)];
    const notes = generatePianoArrangement(chords);

    const notesByBar = new Map<number, number[]>();
    for (const note of notes) {
      const bar = notesByBar.get(note.startBeat) ?? [];
      bar.push(note.pitch);
      notesByBar.set(note.startBeat, bar);
    }

    const numericSort = (a: number, b: number) => a - b;
    expect([...notesByBar.get(0)!].map(pitchClassOf).sort(numericSort)).toEqual([0, 4, 7]); // C
    expect([...notesByBar.get(4)!].map(pitchClassOf).sort(numericSort)).toEqual([0, 5, 9]); // F
    expect([...notesByBar.get(8)!].map(pitchClassOf).sort(numericSort)).toEqual([2, 7, 11]); // G

    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(48);
      expect(note.pitch).toBeLessThanOrEqual(72);
    }
  });

  test("skips a bar whose chord symbol can't be parsed", () => {
    const notes = generatePianoArrangement([chord("Cadd9", 0), chord("C", 4)]);
    expect(notes.every((note) => note.startBeat === 4)).toBe(true);
  });

  test("is deterministic for the same input", () => {
    const chords = [chord("C", 0), chord("F", 4), chord("G", 8), chord("C", 12)];
    expect(generatePianoArrangement(chords)).toEqual(generatePianoArrangement(chords));
  });

  test("arpeggio pattern spreads the voicing across the bar instead of sustaining it", () => {
    const notes = generatePianoArrangement([chord("C", 0)], { pattern: "arpeggio" });
    const startBeats = new Set(notes.map((n) => n.startBeat));
    expect(startBeats.size).toBeGreaterThan(1);
    for (const beat of startBeats) {
      expect(notes.filter((n) => n.startBeat === beat)).toHaveLength(1);
    }
  });

  test("allowExtensions adds the 9th as an extra voiced tone", () => {
    const plain = generatePianoArrangement([chord("C", 0)]);
    const extended = generatePianoArrangement([chord("C", 0)], { allowExtensions: true });

    expect(extended.length).toBe(plain.length + 1);
    expect(extended.map((n) => pitchClassOf(n.pitch)).sort((a, b) => a - b)).toEqual([0, 2, 4, 7]); // C E G D(9th)
  });
});
