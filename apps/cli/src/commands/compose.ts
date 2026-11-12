import { parseArgs } from "node:util";
import { decodeWav, encodeWavPcm16, reduceNoise, transcribeMelody } from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { bassInstrumentPlugin } from "@hum2music/instrument-bass";
import { drumsInstrumentPlugin } from "@hum2music/instrument-drums";
import { guitarInstrumentPlugin } from "@hum2music/instrument-guitar";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import { noteEventsToMidiNotes, writeMultiTrackMidiFile, type MidiTrack } from "@hum2music/midi";
import { builtinSynthRendererPlugin } from "@hum2music/renderer-builtin-synth";
import { createHum2Music } from "@hum2music/sdk";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";

const DEFAULT_SEED = 42;
const DEFAULT_INSTRUMENTS = ["piano", "bass", "drums", "guitar"];
/** Static per-instrument MIDI channel assignment for the multi-track export; 9 is the GM percussion channel. */
const CHANNELS: Record<string, number> = { piano: 1, bass: 2, drums: 9, guitar: 3, violin: 4 };

/**
 * Same transcribe -> harmony -> arrange -> export pipeline as `generate`,
 * but routed entirely through the Plugin API (PRD UPDATE_PRD.md §11.1)
 * instead of the fixed-instrument-list composeTracks(): instruments and
 * style are resolved dynamically from the registered plugins, so adding a
 * new instrument plugin (e.g. a third-party violin package) doesn't
 * require touching this command.
 */
export async function runCompose(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      wav: { type: "string" },
      instruments: { type: "string" },
      seed: { type: "string" },
      bpm: { type: "string" },
      style: { type: "string" },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  const outputPath = values.output;
  if (!inputPath || !outputPath) {
    console.error(
      "Usage: hum2music compose <input.wav> -o <song.mid> [--wav <song.wav>] [--instruments piano,violin,bass,drums,guitar] [--style pop|ballad] [--seed <number>] [--bpm <number>]",
    );
    process.exit(1);
  }

  const buffer = await Bun.file(inputPath).arrayBuffer();
  const { sampleRate, samples } = decodeWav(buffer);
  const denoisedSamples = reduceNoise(samples, sampleRate);
  const transcribedNotes = transcribeMelody(denoisedSamples, sampleRate);

  if (transcribedNotes.length === 0) {
    console.error("No valid pitch could be detected in the input audio.");
    process.exit(1);
  }

  const app = createHum2Music();
  await app.use(pianoInstrumentPlugin);
  await app.use(violinInstrumentPlugin);
  await app.use(bassInstrumentPlugin);
  await app.use(drumsInstrumentPlugin);
  await app.use(guitarInstrumentPlugin);
  await app.use(popBalladStylePlugin);
  await app.use(builtinSynthRendererPlugin);

  const styleId = values.style;
  const style = styleId ? app.getStyle(styleId) : undefined;
  if (styleId && !style) {
    console.error(`Unknown style "${styleId}". Registered styles: ${listRegisteredStyles(app)}.`);
    process.exit(1);
  }

  const timedNotes: TimedNote[] = transcribedNotes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));

  const overrideBpm = values.bpm !== undefined ? Number(values.bpm) : undefined;
  const harmony = analyzeHarmony(timedNotes, { overrideBpm, progressionWeights: style?.harmony?.progressionWeights });

  const seed = values.seed !== undefined ? Number(values.seed) : DEFAULT_SEED;
  const instruments = parseInstruments(values.instruments);

  const composition = await app.compose({
    melody: harmony.melody,
    chords: harmony.chords,
    bpm: harmony.selectedBpm,
    sections: harmony.songSections,
    instruments,
    style: styleId,
    seed,
  });

  // compose() only arranges the requested instruments; the raw melody
  // itself is an input, not a plugin instrument, so it's added here as its
  // own "melody" track to match what `generate` always includes.
  const compositionWithMelody = {
    ...composition,
    tracks: [{ instrumentId: "melody", notes: harmony.melody }, ...composition.tracks],
  };

  const midiTracks: MidiTrack[] = compositionWithMelody.tracks.map((track) => ({
    notes: noteEventsToMidiNotes(track.notes, harmony.selectedBpm),
    channel: CHANNELS[track.instrumentId] ?? 0,
  }));
  const midiBytes = writeMultiTrackMidiFile(midiTracks, { bpm: harmony.selectedBpm });
  await Bun.write(outputPath, midiBytes);
  console.log(`Wrote ${midiTracks.length} track(s) to ${outputPath}`);

  if (values.wav) {
    const audio = await app.render(compositionWithMelody, "builtin-synth", { seed });
    await Bun.write(values.wav, encodeWavPcm16(audio.samples[0], audio.sampleRate));
    console.log(`Wrote WAV preview to ${values.wav}`);
  }

  await app.dispose();
}

function parseInstruments(raw: string | undefined): string[] {
  if (raw === undefined) return DEFAULT_INSTRUMENTS;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function listRegisteredStyles(app: ReturnType<typeof createHum2Music>): string {
  return ["pop", "ballad"].filter((id) => app.getStyle(id)).join(", ") || "(none)";
}
