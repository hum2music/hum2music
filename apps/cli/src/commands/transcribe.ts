import { parseArgs } from "node:util";
import { decodeWav, reduceNoise, transcribeMelody } from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { humanizeMelody } from "@hum2music/expression";
import { noteEventsToMidiNotes, writeStandardMidiFile } from "@hum2music/midi";
import { readFileAsArrayBuffer, writeFileData } from "../fs-compat.ts";

const DEFAULT_SEED = 42;

export async function runTranscribe(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      humanize: { type: "string" },
      seed: { type: "string" },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  const outputPath = values.output;

  if (!inputPath || !outputPath) {
    console.error("Usage: hum2music transcribe <input.wav> -o <output.mid> [--humanize <0-1>] [--seed <number>]");
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

  const midiBytes =
    values.humanize !== undefined
      ? buildHumanizedMidi(transcribedNotes, Number(values.humanize), values.seed !== undefined ? Number(values.seed) : DEFAULT_SEED)
      : writeStandardMidiFile(
          transcribedNotes.map((note) => ({
            pitch: note.midiPitch,
            startMs: note.startMs,
            durationMs: note.durationMs,
            velocity: note.velocity,
          })),
        );

  await writeFileData(outputPath, midiBytes);
  console.log(`Wrote ${transcribedNotes.length} note(s) to ${outputPath}`);
}

function buildHumanizedMidi(
  transcribedNotes: ReturnType<typeof transcribeMelody>,
  humanizeAmount: number,
  seed: number,
): Uint8Array {
  const timedNotes: TimedNote[] = transcribedNotes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));

  const { melody, selectedBpm } = analyzeHarmony(timedNotes);
  const humanized = humanizeMelody(melody, { seed, humanizeAmount, bpm: selectedBpm, instrument: "melody" });
  const midiNotes = noteEventsToMidiNotes(humanized, selectedBpm);

  return writeStandardMidiFile(midiNotes, { bpm: selectedBpm });
}
