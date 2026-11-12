import type { NoteEvent } from "@hum2music/core";
import { chordPitchClasses, closestToneInRange, parseChordSymbol } from "@hum2music/music-theory";
import type { ArrangementContext, InstrumentArranger } from "@hum2music/plugin-api";

const VELOCITY = 75;
/** Used only if the registered InstrumentDefinition omits pitchRange. */
const DEFAULT_RANGE = { min: 48, max: 91 };

/**
 * Same single-voice, closest-chord-tone approach as the violin/cello sample
 * plugins — basic voice-leading, not the Classical Composition Engine's
 * Counterpoint Engine (PRD UPDATE_PRD.md §8.3, future work per
 * tasks/STATUS.md).
 */
export const violaArranger: InstrumentArranger = {
  id: "@hum2music/instrument-viola/arranger",
  instrumentId: "viola",
  async arrange(context: ArrangementContext): Promise<NoteEvent[]> {
    const range = context.instrument.pitchRange ?? DEFAULT_RANGE;
    const notes: NoteEvent[] = [];
    let previousPitch = Math.round((range.min + range.max) / 2);

    for (const chord of context.chords) {
      const parsed = parseChordSymbol(chord.symbol);
      if (!parsed) continue;

      const toneClasses = chordPitchClasses(parsed.root, parsed.quality);
      const pitch = closestToneInRange(toneClasses, previousPitch, range);
      notes.push({ pitch, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity: VELOCITY });
      previousPitch = pitch;
    }

    return notes;
  },
};
