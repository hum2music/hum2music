import type { NoteEvent } from "@hum2music/core";
import { chordPitchClasses, closestToneInRange, parseChordSymbol } from "@hum2music/music-theory";
import type { ArrangementContext, InstrumentArranger } from "@hum2music/plugin-api";

const VELOCITY = 78;
/** Used only if the registered InstrumentDefinition omits pitchRange. */
const DEFAULT_RANGE = { min: 36, max: 76 };

/**
 * Same single-voice, closest-chord-tone approach as the violin/viola sample
 * plugins, but anchored toward the root (favoring it as the nearest tone
 * when available) to read more like a bass voice than a countermelody.
 */
export const celloArranger: InstrumentArranger = {
  id: "@hum2music/instrument-cello/arranger",
  instrumentId: "cello",
  async arrange(context: ArrangementContext): Promise<NoteEvent[]> {
    const range = context.instrument.pitchRange ?? DEFAULT_RANGE;
    const notes: NoteEvent[] = [];
    let previousPitch = range.min + 12;

    for (const chord of context.chords) {
      const parsed = parseChordSymbol(chord.symbol);
      if (!parsed) continue;

      const pitch = closestToneInRange([parsed.root], previousPitch, range);
      notes.push({ pitch, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity: VELOCITY });
      previousPitch = pitch;
    }

    return notes;
  },
};
