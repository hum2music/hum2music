import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { chordPitchClasses, parseChordSymbol, pitchClassOf } from "@hum2music/music-theory";
import type { ArrangementContext, InstrumentArranger } from "./types";

/** Standard tuning, low to high string (open-string MIDI pitches): E2 A2 D3 G3 B3 E4. */
const OPEN_STRING_PITCHES = [40, 45, 50, 55, 59, 64];
/** Max frets apart a single hand position can comfortably cover. */
const MAX_FRET_SPAN = 3;
/** How far up the neck to search for a playable voicing before giving up on a string. */
const MAX_FRET_SEARCH = 9;

const DOWN_STROKE_VELOCITY = 80;
const UP_STROKE_VELOCITY = 60;
const STROKE_DURATION_FRACTION = 0.9;

export interface GuitarArrangementOptions {
  pattern?: "strum" | "arpeggio";
}

/**
 * Finds a playable chord shape (one fret-window position, each string
 * either muted or fretted within that window) and plays it as either a
 * strummed down/up pattern or a simple arpeggio. Never generates a shape
 * that would require a fret span wider than a hand can cover (PRD §9.4).
 */
export function generateGuitarArrangement(chords: ChordEvent[], options: GuitarArrangementOptions = {}): NoteEvent[] {
  const pattern = options.pattern ?? "strum";
  const notes: NoteEvent[] = [];

  for (const chord of chords) {
    const parsed = parseChordSymbol(chord.symbol);
    if (!parsed) continue;

    const chordTones = new Set(chordPitchClasses(parsed.root, parsed.quality));
    const voicing = findPlayableVoicing(chordTones);
    if (voicing.length === 0) continue;

    const quarter = chord.durationBeats / 4;
    if (pattern === "arpeggio") {
      voicing.forEach((pitch, index) => {
        const beatOffset = (index % 4) * quarter;
        notes.push({
          pitch,
          startBeat: chord.startBeat + beatOffset,
          durationBeats: quarter * STROKE_DURATION_FRACTION,
          velocity: DOWN_STROKE_VELOCITY,
        });
      });
      continue;
    }

    for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
      const isDownStroke = beatIndex % 2 === 0;
      const velocity = isDownStroke ? DOWN_STROKE_VELOCITY : UP_STROKE_VELOCITY;
      for (const pitch of voicing) {
        notes.push({
          pitch,
          startBeat: chord.startBeat + beatIndex * quarter,
          durationBeats: quarter * STROKE_DURATION_FRACTION,
          velocity,
        });
      }
    }
  }

  return notes;
}

/** Scans fret-window positions and returns the one that sounds the most strings. */
function findPlayableVoicing(chordTones: Set<number>): number[] {
  let best: number[] = [];

  for (let windowStart = 0; windowStart <= MAX_FRET_SEARCH; windowStart++) {
    const pitches: number[] = [];
    for (const openPitch of OPEN_STRING_PITCHES) {
      const fret = findFretInWindow(openPitch, windowStart, chordTones);
      if (fret !== null) pitches.push(openPitch + fret);
    }
    if (pitches.length > best.length) best = pitches;
    if (best.length === OPEN_STRING_PITCHES.length) break;
  }

  return best;
}

function findFretInWindow(openPitch: number, windowStart: number, chordTones: Set<number>): number | null {
  const frets = windowStart === 0 ? [0, 1, 2, 3] : range(windowStart, windowStart + MAX_FRET_SPAN);
  for (const fret of frets) {
    if (chordTones.has(pitchClassOf(openPitch + fret))) return fret;
  }
  return null;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const guitarArranger: InstrumentArranger = {
  generate: (context: ArrangementContext) => generateGuitarArrangement(context.chords),
};
