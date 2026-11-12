import { parseArgs } from "node:util";
import { decodeWav, reduceNoise, transcribeMelody } from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { readFileAsArrayBuffer } from "../fs-compat.ts";

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

  const buffer = await readFileAsArrayBuffer(inputPath);
  const { sampleRate, samples } = decodeWav(buffer);
  const denoisedSamples = reduceNoise(samples, sampleRate);
  const transcribedNotes = transcribeMelody(denoisedSamples, sampleRate);

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
          songSections: values.chords ? analysis.songSections : undefined,
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
    console.log(`Song structure: ${formatSongSections(analysis.songSections)}`);
  }
}

function formatSongSections(sections: ReturnType<typeof analyzeHarmony>["songSections"]): string {
  return sections.map((s) => s.label).join("") || "(none)";
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
