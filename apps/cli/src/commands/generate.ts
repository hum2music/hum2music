import { parseArgs } from "node:util";
import {
  ARRANGEABLE_INSTRUMENTS,
  composeTracks,
  type ArrangeableInstrument,
  type ComposedTrack,
} from "@hum2music/arrangement";
import { decodeWav, encodeWavPcm16, midiNoteToFrequency, transcribeMelody } from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { noteEventsToMidiNotes, writeMultiTrackMidiFile, type MidiNoteEvent, type MidiTrack } from "@hum2music/midi";
import {
  classifyDrumNote,
  renderToSamples,
  type DrumRenderNote,
  type PitchedRenderNote,
  type Timbre,
} from "@hum2music/rendering";

const DEFAULT_SEED = 42;

export async function runGenerate(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      wav: { type: "string" },
      instruments: { type: "string" },
      humanize: { type: "string" },
      seed: { type: "string" },
      bpm: { type: "string" },
      style: { type: "string" },
      "song-structure": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  const outputPath = values.output;
  if (!inputPath || !outputPath) {
    console.error(
      "Usage: hum2music generate <input.wav> -o <song.mid> [--wav <song.wav>] [--instruments piano,bass,drums,guitar] [--style pop|ballad] [--song-structure] [--humanize <0-1>] [--seed <number>] [--bpm <number>]",
    );
    process.exit(1);
  }

  const buffer = await Bun.file(inputPath).arrayBuffer();
  const { sampleRate, samples } = decodeWav(buffer);
  const transcribedNotes = transcribeMelody(samples, sampleRate);

  if (transcribedNotes.length === 0) {
    console.error("No valid pitch could be detected in the input audio.");
    process.exit(1);
  }

  const timedNotes: TimedNote[] = transcribedNotes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));

  const overrideBpm = values.bpm !== undefined ? Number(values.bpm) : undefined;
  const { melody, chords, songSections, selectedBpm } = analyzeHarmony(timedNotes, { overrideBpm });

  const seed = values.seed !== undefined ? Number(values.seed) : DEFAULT_SEED;
  const tracks = composeTracks({
    melody,
    chords,
    instruments: parseInstruments(values.instruments),
    humanizeAmount: values.humanize !== undefined ? Number(values.humanize) : 0,
    seed,
    bpm: selectedBpm,
    style: values.style,
    songSections: values["song-structure"] ? songSections : undefined,
  });

  const midiTracks: MidiTrack[] = tracks.map((track) => ({
    notes: noteEventsToMidiNotes(track.notes, selectedBpm),
    channel: track.channel,
    programNumber: track.programNumber,
  }));
  const midiBytes = writeMultiTrackMidiFile(midiTracks, { bpm: selectedBpm });
  await Bun.write(outputPath, midiBytes);
  console.log(`Wrote ${midiTracks.length} track(s) to ${outputPath}`);

  if (values.wav) {
    const wavBytes = renderTracksToWav(tracks, selectedBpm, seed);
    await Bun.write(values.wav, wavBytes);
    console.log(`Wrote WAV preview to ${values.wav}`);
  }
}

function parseInstruments(raw: string | undefined): ArrangeableInstrument[] {
  if (raw === undefined) return [...ARRANGEABLE_INSTRUMENTS];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is ArrangeableInstrument => (ARRANGEABLE_INSTRUMENTS as readonly string[]).includes(value));
}

function renderTracksToWav(tracks: ComposedTrack[], bpm: number, seed: number): ArrayBuffer {
  const pitchedNotes: PitchedRenderNote[] = [];
  const drumNotes: DrumRenderNote[] = [];

  for (const track of tracks) {
    const midiNotes: MidiNoteEvent[] = noteEventsToMidiNotes(track.notes, bpm);
    if (track.instrument === "drums") {
      for (const note of midiNotes) {
        drumNotes.push({
          startMs: note.startMs,
          durationMs: note.durationMs,
          velocity: note.velocity,
          drumType: classifyDrumNote(note.pitch),
        });
      }
    } else {
      const timbre = track.instrument as Timbre;
      for (const note of midiNotes) {
        pitchedNotes.push({
          startMs: note.startMs,
          durationMs: note.durationMs,
          velocity: note.velocity,
          frequencyHz: midiNoteToFrequency(note.pitch),
          timbre,
        });
      }
    }
  }

  return encodeWavPcm16(renderToSamples(pitchedNotes, drumNotes, { seed }), 44100);
}
