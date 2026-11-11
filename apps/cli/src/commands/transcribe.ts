import { parseArgs } from "node:util";
import { decodeWav, transcribeMelody } from "@hum2music/audio-analysis";
import { writeStandardMidiFile } from "@hum2music/midi";

export async function runTranscribe(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  const outputPath = values.output;

  if (!inputPath || !outputPath) {
    console.error("Usage: hum2music transcribe <input.wav> -o <output.mid>");
    process.exit(1);
  }

  const buffer = await Bun.file(inputPath).arrayBuffer();
  const { sampleRate, samples } = decodeWav(buffer);
  const notes = transcribeMelody(samples, sampleRate);

  if (notes.length === 0) {
    console.error("No valid pitch could be detected in the input audio.");
    process.exit(1);
  }

  const midiBytes = writeStandardMidiFile(
    notes.map((note) => ({
      pitch: note.midiPitch,
      startMs: note.startMs,
      durationMs: note.durationMs,
      velocity: note.velocity,
    })),
  );

  await Bun.write(outputPath, midiBytes);
  console.log(`Wrote ${notes.length} note(s) to ${outputPath}`);
}
