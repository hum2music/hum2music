export interface MidiNoteEvent {
  pitch: number;
  startMs: number;
  durationMs: number;
  velocity: number;
}

export interface WriteSmfOptions {
  ppq?: number;
  bpm?: number;
  channel?: number;
}

const DEFAULT_PPQ = 480;
const DEFAULT_BPM = 120;

export function writeStandardMidiFile(notes: MidiNoteEvent[], options: WriteSmfOptions = {}): Uint8Array {
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const bpm = options.bpm ?? DEFAULT_BPM;
  const channel = options.channel ?? 0;
  const microsecondsPerQuarter = Math.round(60_000_000 / bpm);

  const header = buildHeaderChunk(1, 2, ppq);
  const tempoTrack = buildTempoTrack(microsecondsPerQuarter);
  const melodyTrack = buildMelodyTrack(notes, ppq, microsecondsPerQuarter, channel);

  return concatBytes([header, tempoTrack, melodyTrack]);
}

function buildHeaderChunk(format: number, numTracks: number, ppq: number): Uint8Array {
  const chunk = new Uint8Array(14);
  const view = new DataView(chunk.buffer);
  chunk.set([0x4d, 0x54, 0x68, 0x64]);
  view.setUint32(4, 6, false);
  view.setUint16(8, format, false);
  view.setUint16(10, numTracks, false);
  view.setUint16(12, ppq, false);
  return chunk;
}

function buildTempoTrack(microsecondsPerQuarter: number): Uint8Array {
  const tempoEvent = [
    0x00,
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
  const timeSignatureEvent = [0x00, 0xff, 0x58, 0x04, 4, 2, 24, 8];
  const endOfTrack = [0x00, 0xff, 0x2f, 0x00];
  return wrapTrackChunk(new Uint8Array([...tempoEvent, ...timeSignatureEvent, ...endOfTrack]));
}

function buildMelodyTrack(
  notes: MidiNoteEvent[],
  ppq: number,
  microsecondsPerQuarter: number,
  channel: number,
): Uint8Array {
  const msPerQuarter = microsecondsPerQuarter / 1000;
  const ticksPerMs = ppq / msPerQuarter;

  type TimedEvent = { tick: number; order: number; bytes: number[] };
  const events: TimedEvent[] = [];

  notes.forEach((note, index) => {
    const startTick = Math.round(note.startMs * ticksPerMs);
    const endTick = Math.max(startTick + 1, Math.round((note.startMs + note.durationMs) * ticksPerMs));
    events.push({ tick: startTick, order: index * 2, bytes: [0x90 | channel, note.pitch, clampVelocity(note.velocity)] });
    events.push({ tick: endTick, order: index * 2 + 1, bytes: [0x80 | channel, note.pitch, 0] });
  });

  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const chunk: number[] = [];
  let lastTick = 0;
  for (const event of events) {
    chunk.push(...encodeVariableLengthQuantity(event.tick - lastTick));
    chunk.push(...event.bytes);
    lastTick = event.tick;
  }
  chunk.push(0x00, 0xff, 0x2f, 0x00);

  return wrapTrackChunk(new Uint8Array(chunk));
}

function wrapTrackChunk(data: Uint8Array): Uint8Array {
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  header.set([0x4d, 0x54, 0x72, 0x6b]);
  view.setUint32(4, data.length, false);
  return concatBytes([header, data]);
}

function encodeVariableLengthQuantity(value: number): number[] {
  if (value < 0) throw new Error("MIDI delta time cannot be negative");

  let buffer = value & 0x7f;
  let remaining = value >> 7;
  while (remaining > 0) {
    buffer <<= 8;
    buffer |= 0x80 | (remaining & 0x7f);
    remaining >>= 7;
  }

  const bytes: number[] = [];
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return bytes;
}

function clampVelocity(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round(velocity)));
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
