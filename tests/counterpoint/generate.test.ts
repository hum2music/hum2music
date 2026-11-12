import { describe, expect, test } from "bun:test";
import type { NoteEvent } from "@hum2music/core";
import {
  classifyMotion,
  crossesVoices,
  generateCounterpointVoice,
  hasForbiddenParallelPerfect,
  isConsonant,
  isPerfectConsonance,
} from "@hum2music/counterpoint";

function cantusNote(pitch: number, startBeat: number): NoteEvent {
  return { pitch, startBeat, durationBeats: 1, velocity: 80 };
}

// A simple stepwise-and-leap cantus firmus in C major, loosely in the
// traditional style (starts and ends on the tonic, mostly stepwise motion).
const CANTUS_FIRMUS: NoteEvent[] = [60, 62, 64, 62, 65, 64, 62, 60].map((pitch, i) => cantusNote(pitch, i));

describe("generateCounterpointVoice", () => {
  test("produces exactly one note per cantus-firmus note, same timing", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    expect(voice).toHaveLength(CANTUS_FIRMUS.length);
    voice.forEach((note, i) => {
      expect(note.startBeat).toBe(CANTUS_FIRMUS[i].startBeat);
      expect(note.durationBeats).toBe(CANTUS_FIRMUS[i].durationBeats);
    });
  });

  test("every note is consonant with its cantus-firmus note", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    voice.forEach((note, i) => {
      expect(isConsonant(CANTUS_FIRMUS[i].pitch, note.pitch)).toBe(true);
    });
  });

  test("the first and last notes form a perfect consonance", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    expect(isPerfectConsonance(CANTUS_FIRMUS[0].pitch, voice[0].pitch)).toBe(true);
    expect(isPerfectConsonance(CANTUS_FIRMUS.at(-1)!.pitch, voice.at(-1)!.pitch)).toBe(true);
  });

  test("never crosses the cantus firmus when placed above it", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    voice.forEach((note, i) => {
      expect(crossesVoices(CANTUS_FIRMUS[i].pitch, note.pitch, true)).toBe(false);
    });
  });

  test("never crosses the cantus firmus when placed below it", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 36, max: 59 }, above: false });
    voice.forEach((note, i) => {
      expect(crossesVoices(CANTUS_FIRMUS[i].pitch, note.pitch, false)).toBe(false);
    });
  });

  test("never introduces parallel/similar motion into consecutive perfect consonances", () => {
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    for (let i = 1; i < voice.length; i++) {
      expect(
        hasForbiddenParallelPerfect(CANTUS_FIRMUS[i - 1].pitch, CANTUS_FIRMUS[i].pitch, voice[i - 1].pitch, voice[i].pitch),
      ).toBe(false);
    }
  });

  test("uses contrary motion somewhere across an 8-note cantus firmus", () => {
    // The scoring favors contrary motion over similar/parallel; over 8 notes
    // with several directional changes in the cantus firmus, at least one
    // step should resolve as contrary rather than always oblique/similar.
    const voice = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    const motions = voice.slice(1).map((note, i) => classifyMotion(CANTUS_FIRMUS[i].pitch, CANTUS_FIRMUS[i + 1].pitch, voice[i].pitch, note.pitch));
    expect(motions).toContain("contrary");
  });

  test("is deterministic for the same input", () => {
    const a = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    const b = generateCounterpointVoice(CANTUS_FIRMUS, { range: { min: 55, max: 79 }, above: true });
    expect(a).toEqual(b);
  });

  test("returns an empty array for an empty cantus firmus", () => {
    expect(generateCounterpointVoice([], { range: { min: 55, max: 79 }, above: true })).toEqual([]);
  });
});
