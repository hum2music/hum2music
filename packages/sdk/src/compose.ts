import type { ChordEvent, KeyCandidate, NoteEvent, SongSection } from "@hum2music/core";
import { applySectionalHumanization } from "@hum2music/arrangement";
import {
  COMPOSITION_SCHEMA_VERSION,
  type ArrangementContext,
  type PluginComposition,
  type PluginContext,
} from "@hum2music/plugin-api";

const DEFAULT_SEED = 42;

export interface ComposeOptions {
  melody: NoteEvent[];
  chords: ChordEvent[];
  bpm: number;
  key?: KeyCandidate;
  sections?: SongSection[];
  /** Instrument IDs to arrange, in the order their tracks should be generated. Each must have both a registered InstrumentDefinition and a matching InstrumentArranger. */
  instruments: string[];
  style?: string;
  seed?: number;
  /**
   * 0 (default) leaves every arranger's output untouched. Above 0, each
   * track is run through @hum2music/expression's section-aware
   * humanization (timing/velocity jitter, swing, a dynamic arc that
   * swells on repeated song sections) — scaled by the active style's
   * `expression.humanizeMultiplier`, same formula as the legacy
   * composeTracks()/`generate` pipeline (PRD §10.5, §11.3).
   */
  humanizeAmount?: number;
}

/**
 * Runs one InstrumentArranger per requested instrument, in order, so each
 * arranger can see the tracks generated before it (PRD UPDATE_PRD.md §5.4's
 * "他の楽器トラック"). Unlike the legacy composeTracks() in
 * @hum2music/arrangement, this resolves arrangers dynamically from the
 * plugin registries rather than from a fixed instrument list.
 */
export async function compose(context: PluginContext, options: ComposeOptions): Promise<PluginComposition> {
  const seed = options.seed ?? DEFAULT_SEED;
  const sections = options.sections ?? [];
  const tracks: PluginComposition["tracks"] = [];
  const otherTracks = new Map<string, NoteEvent[]>();

  const style = options.style ? context.styles.get(options.style) : undefined;
  if (options.style && !style) {
    throw new Error(`No StyleDefinition registered for style id "${options.style}".`);
  }

  for (const instrumentId of options.instruments) {
    const instrument = context.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`No InstrumentDefinition registered for instrument id "${instrumentId}".`);
    }

    const arranger = context.arrangers.list().find((candidate) => candidate.instrumentId === instrumentId);
    if (!arranger) {
      throw new Error(`No InstrumentArranger registered for instrument id "${instrumentId}".`);
    }

    const arrangementContext: ArrangementContext = {
      melody: options.melody,
      chords: options.chords,
      key: options.key,
      bpm: options.bpm,
      sections,
      instrument,
      style,
      otherTracks,
      seed,
    };

    const arrangedNotes = await arranger.arrange(arrangementContext);
    const notes = humanizeTrack(arrangedNotes, instrumentId, sections, options, style?.expression?.humanizeMultiplier);
    tracks.push({ instrumentId, notes });
    otherTracks.set(instrumentId, notes);
  }

  return {
    metadata: {
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      seed,
      bpm: options.bpm,
      key: options.key ? `${options.key.tonic} ${options.key.mode}` : undefined,
    },
    tracks,
    chords: options.chords,
    sections,
  };
}

function humanizeTrack(
  notes: NoteEvent[],
  instrumentId: string,
  sections: SongSection[],
  options: ComposeOptions,
  styleHumanizeMultiplier: number | undefined,
): NoteEvent[] {
  const humanizeAmount = options.humanizeAmount ?? 0;
  if (humanizeAmount <= 0) return notes;

  const baseAmount = Math.min(1, humanizeAmount * (styleHumanizeMultiplier ?? 1));
  return applySectionalHumanization(notes, sections, {
    baseAmount,
    seed: options.seed ?? DEFAULT_SEED,
    bpm: options.bpm,
    instrument: instrumentId,
  });
}
