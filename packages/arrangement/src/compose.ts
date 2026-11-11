import type { ChordEvent, NoteEvent } from "@hum2music/core";
import { humanizeMelody } from "@hum2music/expression";
import { bassArranger } from "./bass";
import { drumsArranger } from "./drums";
import { pianoArranger } from "./piano";

export const ARRANGEABLE_INSTRUMENTS = ["piano", "bass", "drums"] as const;
export type ArrangeableInstrument = (typeof ARRANGEABLE_INSTRUMENTS)[number];

export interface ComposedTrack {
  instrument: "melody" | ArrangeableInstrument;
  notes: NoteEvent[];
  channel: number;
  programNumber?: number;
}

export interface ComposeTracksOptions {
  melody: NoteEvent[];
  chords: ChordEvent[];
  instruments?: Iterable<ArrangeableInstrument>;
  humanizeAmount?: number;
  seed?: number;
  bpm: number;
}

const DEFAULT_SEED = 42;
const CHANNELS: Record<ArrangeableInstrument, number> = { piano: 1, bass: 2, drums: 9 };
const PROGRAM_NUMBERS: Record<ArrangeableInstrument, number | undefined> = { piano: 0, bass: 32, drums: undefined };

/**
 * Builds the melody track plus any requested arranged instrument tracks
 * (piano/bass/drums), optionally humanized per-track. Shared by the CLI's
 * `generate` command and the web UI's export endpoints so arrangement +
 * humanization logic lives in exactly one place.
 */
export function composeTracks(options: ComposeTracksOptions): ComposedTrack[] {
  const included = new Set(options.instruments ?? ARRANGEABLE_INSTRUMENTS);
  const tracks: ComposedTrack[] = [{ instrument: "melody", notes: options.melody, channel: 0 }];

  if (included.has("piano")) {
    tracks.push(arrangedTrack("piano", pianoArranger.generate({ chords: options.chords })));
  }
  if (included.has("bass")) {
    tracks.push(arrangedTrack("bass", bassArranger.generate({ chords: options.chords })));
  }
  if (included.has("drums")) {
    tracks.push(arrangedTrack("drums", drumsArranger.generate({ chords: options.chords })));
  }

  const humanizeAmount = options.humanizeAmount ?? 0;
  if (humanizeAmount <= 0) return tracks;

  const seed = options.seed ?? DEFAULT_SEED;
  return tracks.map((track) => ({
    ...track,
    notes: humanizeMelody(track.notes, { seed, humanizeAmount, bpm: options.bpm, instrument: track.instrument }),
  }));
}

function arrangedTrack(instrument: ArrangeableInstrument, notes: NoteEvent[]): ComposedTrack {
  return { instrument, notes, channel: CHANNELS[instrument], programNumber: PROGRAM_NUMBERS[instrument] };
}
