import { analyzeHarmony, type TimedNote } from "@hum2music/harmony";
import { humanizeMelody } from "@hum2music/expression";
import { noteEventsToMidiNotes, writeStandardMidiFile, type MidiNoteEvent } from "@hum2music/midi";

interface ExportMidiRequestNote {
  midiPitch: number;
  startMs: number;
  durationMs: number;
  velocity: number;
}

interface ExportMidiRequestBody {
  notes?: ExportMidiRequestNote[];
  humanize?: number;
  seed?: number;
  bpm?: number;
}

const DEFAULT_SEED = 42;

export async function handleExportMidi(request: Request): Promise<Response> {
  let body: ExportMidiRequestBody;
  try {
    body = (await request.json()) as ExportMidiRequestBody;
  } catch {
    return jsonError(400, "Request body must be JSON");
  }

  if (!Array.isArray(body.notes) || body.notes.length === 0) {
    return jsonError(400, "'notes' must be a non-empty array");
  }

  const timedNotes: TimedNote[] = body.notes.map((note) => ({
    pitch: note.midiPitch,
    startMs: note.startMs,
    durationMs: note.durationMs,
    velocity: note.velocity,
  }));

  const humanizeAmount = typeof body.humanize === "number" ? body.humanize : 0;
  const seed = typeof body.seed === "number" ? body.seed : DEFAULT_SEED;

  let midiNotes: MidiNoteEvent[];
  let bpm: number;

  if (humanizeAmount > 0) {
    const harmony = analyzeHarmony(timedNotes, body.bpm);
    bpm = harmony.selectedBpm;
    const humanized = humanizeMelody(harmony.melody, { seed, humanizeAmount, bpm, instrument: "melody" });
    midiNotes = noteEventsToMidiNotes(humanized, bpm);
  } else {
    bpm = body.bpm ?? 120;
    midiNotes = body.notes.map((note) => ({
      pitch: note.midiPitch,
      startMs: note.startMs,
      durationMs: note.durationMs,
      velocity: note.velocity,
    }));
  }

  const midiBytes = writeStandardMidiFile(midiNotes, { bpm });

  return new Response(midiBytes, {
    headers: {
      "Content-Type": "audio/midi",
      "Content-Disposition": 'attachment; filename="melody.mid"',
    },
  });
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
