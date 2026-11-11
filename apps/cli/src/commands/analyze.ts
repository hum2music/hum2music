import { parseArgs } from "node:util";
import { decodeWav, transcribeMelody } from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";

export async function runAnalyze(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      chords: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      bpm: { type: "string" },
    },
    allowPositionals: true,
  });

  const inputPath = positionals[0];
  if (!inputPath) {
    console.error("Usage: hum2music analyze <input.wav> [--chords] [--json] [--bpm <number>]");
    process.exit(1);
  }

  const overrideBpm = values.bpm ? Number(values.bpm) : undefined;

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

  const analysis = analyzeHarmony(timedNotes, overrideBpm);

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          tempoCandidates: analysis.tempoCandidates,
          selectedBpm: analysis.selectedBpm,
          keyCandidates: analysis.keyCandidates,
          melody: analysis.melody,
          chords: values.chords ? analysis.chords : undefined,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Tempo candidates: ${formatTempoCandidates(analysis.tempoCandidates)}`);
  console.log(`Selected BPM: ${analysis.selectedBpm}`);
  console.log(`Key candidates: ${formatKeyCandidates(analysis.keyCandidates)}`);

  if (values.chords) {
    console.log("Chord progression:");
    for (const chord of analysis.chords) {
      console.log(
        `  bar @ beat ${chord.startBeat}: ${chord.symbol} (confidence ${chord.confidence.toFixed(2)})`,
      );
    }
  }
}

function formatTempoCandidates(candidates: ReturnType<typeof analyzeHarmony>["tempoCandidates"]): string {
  return candidates.map((c) => `${c.bpm} BPM (${(c.confidence * 100).toFixed(0)}%)`).join(", ");
}

function formatKeyCandidates(candidates: ReturnType<typeof analyzeHarmony>["keyCandidates"]): string {
  return candidates
    .slice(0, 3)
    .map((c) => `${c.tonic} ${c.mode} (${(c.confidence * 100).toFixed(0)}%)`)
    .join(", ");
}
