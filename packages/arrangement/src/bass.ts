import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { parseChordSymbol, pitchClassOf } from "@hum2music/music-theory";
import type { ArrangementContext, InstrumentArranger } from "./types";

const ROOT_OCTAVE_BASE_PITCH = 36; // the C in "C2", i.e. lowestPitchInOctave(0, ...) = 36
const VELOCITY = 75;
const APPROACH_VELOCITY = 65;

/**
 * Root-driven bass: holds the chord root through beats 1-2, repeats it on
 * beat 3, then on beat 4 plays a chromatic approach note into the next
 * chord's root (or holds the root again on the final bar). Lands on the
 * same strong beats (1 and 3) as the drum arranger's kick, approximating
 * "kick sync" without reading the drum track directly (PRD §9.3).
 */
export function generateBassArrangement(chords: ChordEvent[]): NoteEvent[] {
  const notes: NoteEvent[] = [];

  chords.forEach((chord, index) => {
    const parsed = parseChordSymbol(chord.symbol);
    if (!parsed) return;

    const quarter = chord.durationBeats / 4;
    const rootPitch = lowestPitchInOctave(parsed.root);

    notes.push(note(rootPitch, chord.startBeat, quarter * 2, VELOCITY));
    notes.push(note(rootPitch, chord.startBeat + quarter * 2, quarter, VELOCITY));

    const nextChord = chords[index + 1];
    const nextParsed = nextChord ? parseChordSymbol(nextChord.symbol) : null;
    const lastBeatPitch = nextParsed ? lowestPitchInOctave(nextParsed.root) - 1 : rootPitch;
    const lastBeatVelocity = nextParsed ? APPROACH_VELOCITY : VELOCITY;

    notes.push(note(lastBeatPitch, chord.startBeat + quarter * 3, quarter, lastBeatVelocity));
  });

  return notes;
}

function lowestPitchInOctave(pitchClass: number): number {
  return ROOT_OCTAVE_BASE_PITCH + pitchClassOf(pitchClass);
}

function note(pitch: number, startBeat: number, durationBeats: number, velocity: number): NoteEvent {
  return { pitch, startBeat, durationBeats, velocity };
}

export const bassArranger: InstrumentArranger = {
  generate: (context: ArrangementContext) => generateBassArrangement(context.chords),
};
