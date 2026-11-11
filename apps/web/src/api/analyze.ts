import {
  decodeWav,
  detectPitchYin,
  removePitchOutliers,
  smoothPitchTrajectory,
  transcribeMelody,
} from "@hum2music/audio-analysis";
import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";

export async function handleAnalyze(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("audio");

  if (!(file instanceof Blob)) {
    return jsonError(400, "Missing 'audio' file field");
  }

  let sampleRate: number;
  let samples: Float32Array;
  try {
    ({ sampleRate, samples } = decodeWav(await file.arrayBuffer()));
  } catch (error) {
    return jsonError(400, `Could not decode audio: ${(error as Error).message}`);
  }

  // Recomputes the pitch track for display (transcribeMelody runs the same
  // YIN pass internally) — a known inefficiency, acceptable for a local,
  // single-request preview endpoint. See tasks/STATUS.md.
  const pitchCurve = smoothPitchTrajectory(removePitchOutliers(detectPitchYin(samples, sampleRate)));
  const notes = transcribeMelody(samples, sampleRate);

  if (notes.length === 0) {
    return jsonError(422, "No valid pitch could be detected in the input audio.");
  }

  const timedNotes: TimedNote[] = notes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));
  const harmony = analyzeHarmony(timedNotes);

  return Response.json({
    sampleRate,
    pitchCurve,
    notes,
    tempoCandidates: harmony.tempoCandidates,
    selectedBpm: harmony.selectedBpm,
    keyCandidates: harmony.keyCandidates,
    chords: harmony.chords,
  });
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
