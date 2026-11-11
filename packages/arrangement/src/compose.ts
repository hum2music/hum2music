import type { ChordEvent, NoteEvent, SongSection } from "@hum2music/core";
import { generateBassArrangement } from "./bass";
import { generateDrumArrangement } from "./drums";
import { generateGuitarArrangement } from "./guitar";
import { generatePianoArrangement } from "./piano";
import { applySectionalHumanization } from "./sectional-humanize";
import { resolveStyleProfile, type StyleProfile } from "./style";

export const ARRANGEABLE_INSTRUMENTS = ["piano", "bass", "drums", "guitar"] as const;
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
  /** Defaults to the "pop" profile; see style.ts. Governs pattern choice, voicing extensions, drum density, and GM program numbers. */
  style?: StyleProfile | string;
  /** When given (and non-empty), humanization intensity varies per bar by repeated section (see sectional-humanize.ts) instead of one flat amount. */
  songSections?: SongSection[];
}

const DEFAULT_SEED = 42;
const CHANNELS: Record<ArrangeableInstrument, number> = { piano: 1, bass: 2, drums: 9, guitar: 3 };

/**
 * Builds the melody track plus any requested arranged instrument tracks
 * (piano/bass/drums/guitar), optionally humanized per-track. Shared by the
 * CLI's `generate` command and the web UI's export endpoints so
 * arrangement + humanization logic lives in exactly one place.
 */
export function composeTracks(options: ComposeTracksOptions): ComposedTrack[] {
  const style = resolveStyle(options.style);
  const included = new Set(options.instruments ?? ARRANGEABLE_INSTRUMENTS);

  const tracks: ComposedTrack[] = [{ instrument: "melody", notes: options.melody, channel: 0 }];

  if (included.has("piano")) {
    const notes = generatePianoArrangement(options.chords, {
      pattern: style.pianoPattern,
      allowExtensions: style.pianoAllowExtensions,
    });
    tracks.push({ instrument: "piano", notes, channel: CHANNELS.piano, programNumber: style.programNumbers.piano });
  }
  if (included.has("bass")) {
    const notes = generateBassArrangement(options.chords);
    tracks.push({ instrument: "bass", notes, channel: CHANNELS.bass, programNumber: style.programNumbers.bass });
  }
  if (included.has("drums")) {
    const notes = generateDrumArrangement(options.chords, { density: style.drumDensity });
    tracks.push({ instrument: "drums", notes, channel: CHANNELS.drums });
  }
  if (included.has("guitar")) {
    const notes = generateGuitarArrangement(options.chords, { pattern: style.guitarPattern });
    tracks.push({ instrument: "guitar", notes, channel: CHANNELS.guitar, programNumber: style.programNumbers.guitar });
  }

  const humanizeAmount = options.humanizeAmount ?? 0;
  if (humanizeAmount <= 0) return tracks;

  const seed = options.seed ?? DEFAULT_SEED;
  const sections = options.songSections ?? [];
  return tracks.map((track) => ({
    ...track,
    notes: applySectionalHumanization(track.notes, sections, {
      baseAmount: Math.min(1, humanizeAmount * style.humanizeMultiplier),
      seed,
      bpm: options.bpm,
      instrument: track.instrument,
    }),
  }));
}

function resolveStyle(style: StyleProfile | string | undefined): StyleProfile {
  return typeof style === "string" || style === undefined ? resolveStyleProfile(style) : style;
}
