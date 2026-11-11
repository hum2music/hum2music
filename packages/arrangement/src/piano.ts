import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { chordPitchClasses, parseChordSymbol, pitchClassOf } from "@hum2music/music-theory";
import type { ArrangementContext, InstrumentArranger } from "./types";

const MIN_PITCH = 48; // C3
const MAX_PITCH = 72; // C5
const VELOCITY = 70;

/**
 * Block-chord comping: for each bar, picks the voicing (octave placement of
 * the chord's tones within the piano's range) with the smallest total
 * movement from the previous bar's voicing, rather than always using the
 * same inversion (PRD §9.2).
 */
export function generatePianoArrangement(chords: ChordEvent[]): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let previousVoicing: number[] | null = null;

  for (const chord of chords) {
    const parsed = parseChordSymbol(chord.symbol);
    if (!parsed) continue;

    const voicing = chooseVoicing(chordPitchClasses(parsed.root, parsed.quality), previousVoicing);
    previousVoicing = voicing;

    for (const pitch of voicing) {
      notes.push({ pitch, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity: VELOCITY });
    }
  }

  return notes;
}

function chooseVoicing(toneClasses: number[], previousVoicing: number[] | null): number[] {
  const candidates = enumerateVoicingsInRange(toneClasses);
  if (candidates.length === 0) return toneClasses.map((pc) => pc + 60);
  if (!previousVoicing) return candidates[0];

  let best = candidates[0];
  let bestMovement = totalVoiceMovement(previousVoicing, best);
  for (const candidate of candidates.slice(1)) {
    const movement = totalVoiceMovement(previousVoicing, candidate);
    if (movement < bestMovement) {
      best = candidate;
      bestMovement = movement;
    }
  }
  return best;
}

function enumerateVoicingsInRange(toneClasses: number[]): number[][] {
  const optionsPerTone = toneClasses.map((pitchClass) => {
    const options: number[] = [];
    for (let pitch = MIN_PITCH; pitch <= MAX_PITCH; pitch++) {
      if (pitchClassOf(pitch) === pitchClass) options.push(pitch);
    }
    return options;
  });

  let combinations: number[][] = [[]];
  for (const options of optionsPerTone) {
    const next: number[][] = [];
    for (const combo of combinations) {
      for (const option of options) next.push([...combo, option]);
    }
    combinations = next;
  }

  return combinations.map((combo) => [...combo].sort((a, b) => a - b));
}

function totalVoiceMovement(previous: number[], candidate: number[]): number {
  return candidate.reduce((sum, pitch) => sum + Math.min(...previous.map((p) => Math.abs(p - pitch))), 0);
}

export const pianoArranger: InstrumentArranger = {
  generate: (context: ArrangementContext) => generatePianoArrangement(context.chords),
};
