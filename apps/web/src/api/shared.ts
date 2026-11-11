import {
  ARRANGEABLE_INSTRUMENTS,
  composeTracks,
  type ArrangeableInstrument,
} from "@hum2music/arrangement";
import type { ChordEvent } from "@hum2music/core";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { noteEventsToMidiNotes, type MidiNoteEvent } from "@hum2music/midi";

export interface ExportRequestNote {
  midiPitch: number;
  startMs: number;
  durationMs: number;
  velocity: number;
}

export interface ExportRequestBody {
  notes?: ExportRequestNote[];
  /** Omit (or leave empty) for melody-only export; provide to arrange piano/bass/drums. May be user-edited. */
  chords?: ChordEvent[];
  instruments?: string[];
  humanize?: number;
  seed?: number;
  bpm?: number;
  /** "pop" (default) or "ballad"; see packages/arrangement/src/style.ts. */
  style?: string;
  /** When true, humanize intensity varies by detected repeated section instead of staying flat. */
  songStructure?: boolean;
}

export interface ResolvedTrack {
  instrument: string;
  notes: MidiNoteEvent[];
  channel: number;
  programNumber?: number;
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * Resolves a request into ms-based, export-ready tracks. Shared by
 * /api/export/midi and /api/export/wav so both honor the same instrument
 * selection and chord progression (auto-detected or user-edited).
 *
 * - No chords and no humanize: raw passthrough of the posted notes (no
 *   quantization), matching the CLI's `transcribe` default behavior.
 * - No chords but humanize > 0: quantizes the melody (needed for
 *   humanization) but arranges no instrument tracks.
 * - Chords present: full melody + requested-instrument arrangement.
 */
export function resolveComposition(body: ExportRequestBody): { tracks: ResolvedTrack[]; bpm: number } {
  const notes = body.notes ?? [];
  const humanizeAmount = typeof body.humanize === "number" ? body.humanize : 0;
  const seed = typeof body.seed === "number" ? body.seed : undefined;
  const hasChords = Array.isArray(body.chords) && body.chords.length > 0;

  if (!hasChords && humanizeAmount <= 0) {
    const bpm = body.bpm ?? 120;
    const rawNotes: MidiNoteEvent[] = notes.map((note) => ({
      pitch: note.midiPitch,
      startMs: note.startMs,
      durationMs: note.durationMs,
      velocity: note.velocity,
    }));
    return { tracks: [{ instrument: "melody", notes: rawNotes, channel: 0 }], bpm };
  }

  const timedNotes: TimedNote[] = notes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));
  const harmony = analyzeHarmony(timedNotes, { overrideBpm: body.bpm });
  const bpm = harmony.selectedBpm;

  const composed = composeTracks({
    melody: harmony.melody,
    chords: body.chords ?? [],
    instruments: hasChords ? parseInstruments(body.instruments) : [],
    humanizeAmount,
    seed,
    bpm,
    style: body.style,
    songSections: body.songStructure ? harmony.songSections : undefined,
  });

  const tracks: ResolvedTrack[] = composed.map((track) => ({
    instrument: track.instrument,
    notes: noteEventsToMidiNotes(track.notes, bpm),
    channel: track.channel,
    programNumber: track.programNumber,
  }));

  return { tracks, bpm };
}

function parseInstruments(raw: string[] | undefined): ArrangeableInstrument[] {
  if (!raw) return [...ARRANGEABLE_INSTRUMENTS];
  return raw.filter((value): value is ArrangeableInstrument =>
    (ARRANGEABLE_INSTRUMENTS as readonly string[]).includes(value),
  );
}
