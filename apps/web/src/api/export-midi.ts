import { writeMultiTrackMidiFile } from "@hum2music/midi";
import { jsonError, resolveComposition, type ExportRequestBody } from "./shared";

export async function handleExportMidi(request: Request): Promise<Response> {
  let body: ExportRequestBody;
  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    return jsonError(400, "Request body must be JSON");
  }

  if (!Array.isArray(body.notes) || body.notes.length === 0) {
    return jsonError(400, "'notes' must be a non-empty array");
  }

  const { tracks, bpm } = resolveComposition(body);
  const midiBytes = writeMultiTrackMidiFile(
    tracks.map((track) => ({ notes: track.notes, channel: track.channel, programNumber: track.programNumber })),
    { bpm },
  );

  return new Response(midiBytes, {
    headers: {
      "Content-Type": "audio/midi",
      "Content-Disposition": 'attachment; filename="song.mid"',
    },
  });
}
