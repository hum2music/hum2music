import { encodeWavPcm16, midiNoteToFrequency } from "@hum2music/audio-analysis";
import {
  classifyDrumNote,
  renderToSamples,
  type DrumRenderNote,
  type PitchedRenderNote,
  type Timbre,
} from "@hum2music/rendering";
import { jsonError, resolveComposition, type ExportRequestBody } from "./shared";

export async function handleExportWav(request: Request): Promise<Response> {
  let body: ExportRequestBody;
  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    return jsonError(400, "Request body must be JSON");
  }

  if (!Array.isArray(body.notes) || body.notes.length === 0) {
    return jsonError(400, "'notes' must be a non-empty array");
  }

  const { tracks } = resolveComposition(body);
  const pitchedNotes: PitchedRenderNote[] = [];
  const drumNotes: DrumRenderNote[] = [];

  for (const track of tracks) {
    if (track.instrument === "drums") {
      for (const note of track.notes) {
        drumNotes.push({
          startMs: note.startMs,
          durationMs: note.durationMs,
          velocity: note.velocity,
          drumType: classifyDrumNote(note.pitch),
        });
      }
    } else {
      const timbre = track.instrument as Timbre;
      for (const note of track.notes) {
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

  const seed = typeof body.seed === "number" ? body.seed : undefined;
  const samples = renderToSamples(pitchedNotes, drumNotes, { seed });
  const wavBytes = encodeWavPcm16(samples, 44100);

  return new Response(wavBytes, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": 'attachment; filename="song.wav"',
    },
  });
}
