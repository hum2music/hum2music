import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { decodeWav, encodeWavPcm16, reduceNoise, transcribeMelody } from "@hum2music/audio-analysis";
import { deriveSectionTempoCurve } from "@hum2music/expression";
import { analyzeHarmony, type HarmonyAnalysis, type TimedNote } from "@hum2music/harmony";
import { choraleComposerPlugin } from "@hum2music/composer-chorale";
import { motifDevelopmentComposerPlugin } from "@hum2music/composer-motif-development";
import { bassInstrumentPlugin } from "@hum2music/instrument-bass";
import { celloInstrumentPlugin } from "@hum2music/instrument-cello";
import { drumsInstrumentPlugin } from "@hum2music/instrument-drums";
import { guitarInstrumentPlugin } from "@hum2music/instrument-guitar";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { violaInstrumentPlugin } from "@hum2music/instrument-viola";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import { noteEventsToMidiNotes, writeMultiTrackMidiFile, type MidiTrack } from "@hum2music/midi";
import { composeEnsemble } from "@hum2music/orchestration";
import { COMPOSITION_SCHEMA_VERSION, type PluginComposition, type StyleDefinition } from "@hum2music/plugin-api";
import { builtinSynthRendererPlugin } from "@hum2music/renderer-builtin-synth";
import { createHum2Music, type Hum2MusicConfig } from "@hum2music/sdk";
import { chiptuneStylePlugin } from "@hum2music/style-chiptune";
import { pianoSoloStylePlugin } from "@hum2music/style-piano-solo";
import { classicalStylePlugin } from "@hum2music/style-classical";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";
import { readFileAsArrayBuffer, writeFileData } from "../fs-compat.ts";
import { loadPluginModule } from "../plugin-loader.ts";

const DEFAULT_SEED = 42;
const DEFAULT_INSTRUMENTS = ["piano", "bass", "drums", "guitar"];
const DEFAULT_RENDERER = "builtin-synth";
const CONFIG_FILENAME = "hum2music.config.ts";
/** Static per-instrument MIDI channel assignment for the multi-track export; 9 is the GM percussion channel. */
const CHANNELS: Record<string, number> = { piano: 1, bass: 2, drums: 9, guitar: 3, violin: 4, viola: 5, cello: 6 };

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
      orchestrate: { type: "boolean", default: false },
      composer: { type: "string" },
      humanize: { type: "string" },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  const outputPath = values.output;
  if (!inputPath || !outputPath) {
    console.error(
      "Usage: hum2music compose <input.wav> -o <song.mid> [--wav <song.wav>] [--instruments piano,violin,viola,cello,bass,drums,guitar] [--style pop|ballad|classical|chiptune] [--orchestrate] [--composer motif-development|chorale] [--humanize <0-1>] [--seed <number>] [--bpm <number>]",
    );
    process.exit(1);
  }

  const buffer = await readFileAsArrayBuffer(inputPath);
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
  await app.use(violaInstrumentPlugin);
  await app.use(celloInstrumentPlugin);
  await app.use(bassInstrumentPlugin);
  await app.use(drumsInstrumentPlugin);
  await app.use(guitarInstrumentPlugin);
  await app.use(popBalladStylePlugin);
  await app.use(classicalStylePlugin);
  await app.use(chiptuneStylePlugin);
  await app.use(pianoSoloStylePlugin);
  await app.use(builtinSynthRendererPlugin);
  await app.use(motifDevelopmentComposerPlugin);
  await app.use(choraleComposerPlugin);

  const config = await loadConfig();
  for (const specifier of config.plugins ?? []) {
    const plugin = await loadPluginModule(specifier);
    await app.use(plugin);
  }

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

  if (values.composer) {
    await runComposerOutput(app, values.composer, harmony, seed, outputPath, values.wav, config.defaultRenderer);
    await app.dispose();
    return;
  }

  const instruments = parseInstruments(values.instruments);
  const humanizeAmount = values.humanize !== undefined ? Number(values.humanize) : 0;

  const composition = values.orchestrate
    ? await composeWithOrchestration(app, instruments, harmony, styleId, seed, humanizeAmount)
    : await app.compose({
        melody: harmony.melody,
        chords: harmony.chords,
        bpm: harmony.selectedBpm,
        sections: harmony.songSections,
        instruments,
        style: styleId,
        seed,
        humanizeAmount,
      });

  // Outside --orchestrate, compose() only arranges the requested
  // instruments; the raw melody itself is an input, not a plugin
  // instrument, so it's added here as its own "melody" track to match what
  // `generate` always includes. Under --orchestrate, one ensemble
  // instrument already plays the melody role with these exact notes, so
  // adding a separate "melody" track would duplicate it.
  const compositionWithMelody = values.orchestrate
    ? composition
    : { ...composition, tracks: [{ instrumentId: "melody", notes: harmony.melody }, ...composition.tracks] };

  const midiTracks: MidiTrack[] = compositionWithMelody.tracks.map((track) => ({
    notes: noteEventsToMidiNotes(track.notes, harmony.selectedBpm),
    channel: CHANNELS[track.instrumentId] ?? 0,
    programNumber: resolveProgramNumber(app, track.instrumentId, style),
  }));
  const tempoChanges = deriveSectionTempoCurve(harmony.songSections, harmony.selectedBpm, humanizeAmount);
  const midiBytes = writeMultiTrackMidiFile(midiTracks, { bpm: harmony.selectedBpm, tempoChanges });
  await writeFileData(outputPath, midiBytes);
  console.log(`Wrote ${midiTracks.length} track(s) to ${outputPath}`);

  if (values.wav) {
    const audio = await app.render(compositionWithMelody, config.defaultRenderer ?? DEFAULT_RENDERER, { seed });
    await writeFileData(values.wav, encodeWavPcm16(audio.samples[0], audio.sampleRate));
    console.log(`Wrote WAV preview to ${values.wav}`);
  }

  await app.dispose();
}

/**
 * `--orchestrate`: instead of arranging every requested instrument
 * independently, decide roles via @hum2music/orchestration's assignRoles()
 * and realize them - melody instrument plays the melody as-is,
 * countermelody instruments get a real Counterpoint Engine voice, and
 * harmony/bass instruments delegate to their own registered Arranger via
 * a single-instrument app.compose() call each (reusing the existing path
 * rather than reimplementing chordal arranging).
 */
async function composeWithOrchestration(
  app: ReturnType<typeof createHum2Music>,
  instrumentIds: string[],
  harmony: HarmonyAnalysis,
  styleId: string | undefined,
  seed: number,
  humanizeAmount: number,
): Promise<PluginComposition> {
  const ensembleInstruments = instrumentIds.map((id) => {
    const definition = app.listInstruments().find((candidate) => candidate.id === id);
    if (!definition) throw new Error(`No InstrumentDefinition registered for instrument id "${id}".`);
    return definition;
  });

  const ensembleTracks = await composeEnsemble(ensembleInstruments, {
    melody: harmony.melody,
    chords: harmony.chords,
    arrangeChordal: async (instrumentId, chords) => {
      const chordalComposition = await app.compose({
        melody: harmony.melody,
        chords,
        bpm: harmony.selectedBpm,
        sections: harmony.songSections,
        instruments: [instrumentId],
        style: styleId,
        seed,
        humanizeAmount,
      });
      return chordalComposition.tracks[0]?.notes ?? [];
    },
  });

  return {
    metadata: { schemaVersion: COMPOSITION_SCHEMA_VERSION, seed, bpm: harmony.selectedBpm },
    tracks: ensembleTracks.map(({ instrumentId, notes }) => ({ instrumentId, notes })),
    chords: harmony.chords,
    sections: harmony.songSections,
  };
}

/**
 * `--composer <id>`: bypasses the per-instrument Arranger pipeline
 * entirely and runs a registered ComposerPlugin (e.g. "motif-development")
 * directly on the transcribed melody, exporting its notes as a single
 * track and printing the resulting song-section structure (e.g.
 * "Theme -> Var. 1 (...) -> ...").
 */
async function runComposerOutput(
  app: ReturnType<typeof createHum2Music>,
  composerId: string,
  harmony: HarmonyAnalysis,
  seed: number,
  outputPath: string,
  wavPath: string | undefined,
  defaultRenderer: string | undefined,
): Promise<void> {
  const result = await app.composeWithComposer(composerId, {
    melody: harmony.melody,
    chords: harmony.chords,
    sections: harmony.songSections,
    seed,
  });

  const midiTracks: MidiTrack[] = [{ notes: noteEventsToMidiNotes(result.notes, harmony.selectedBpm), channel: 0 }];
  const midiBytes = writeMultiTrackMidiFile(midiTracks, { bpm: harmony.selectedBpm });
  await writeFileData(outputPath, midiBytes);
  console.log(`Wrote composer output (${result.sections.map((section) => section.label).join(" -> ")}) to ${outputPath}`);

  if (!wavPath) return;

  const composition: PluginComposition = {
    metadata: { schemaVersion: COMPOSITION_SCHEMA_VERSION, seed, bpm: harmony.selectedBpm },
    tracks: [{ instrumentId: "melody", notes: result.notes }],
    chords: harmony.chords,
    sections: result.sections,
  };
  const audio = await app.render(composition, defaultRenderer ?? DEFAULT_RENDERER, { seed });
  await writeFileData(wavPath, encodeWavPcm16(audio.samples[0], audio.sampleRate));
  console.log(`Wrote WAV preview to ${wavPath}`);
}

function parseInstruments(raw: string | undefined): string[] {
  if (raw === undefined) return DEFAULT_INSTRUMENTS;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function listRegisteredStyles(app: ReturnType<typeof createHum2Music>): string {
  return app.listStyles().map((style) => style.id).join(", ") || "(none)";
}

/** The active style's orchestration.programNumbers overrides the instrument's own static default, when both exist. */
function resolveProgramNumber(
  app: ReturnType<typeof createHum2Music>,
  instrumentId: string,
  style: StyleDefinition | undefined,
): number | undefined {
  return style?.orchestration?.programNumbers?.[instrumentId] ?? app.listInstruments().find((i) => i.id === instrumentId)?.midi?.program;
}

/** Loads ./hum2music.config.ts from the current working directory, if present (PRD UPDATE_PRD.md §11.1). */
async function loadConfig(): Promise<Hum2MusicConfig> {
  const configPath = resolve(process.cwd(), CONFIG_FILENAME);
  if (!existsSync(configPath)) return {};

  const imported = (await import(configPath)) as { default?: Hum2MusicConfig };
  return imported.default ?? {};
}
