import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startServer } from "@hum2music/web";
import { C_MAJOR_SCALE_HZ, encodeWavPcm16, generateScale, generateSilence } from "../../fixtures/synth";

let server: ReturnType<typeof startServer>;
let baseUrl: string;

beforeAll(() => {
  server = startServer(0);
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

function scaleWavBlob(): Blob {
  const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
  return new Blob([encodeWavPcm16(samples, 44100)], { type: "audio/wav" });
}

describe("static file serving", () => {
  test("GET / serves index.html", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Hum2Music");
  });

  test("GET /style.css serves the stylesheet", async () => {
    const response = await fetch(`${baseUrl}/style.css`);
    expect(response.status).toBe(200);
  });

  test("GET /does-not-exist returns 404", async () => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    expect(response.status).toBe(404);
  });

  test("rejects path traversal outside the public directory", async () => {
    const response = await fetch(`${baseUrl}/../package.json`);
    expect([403, 404]).toContain(response.status);
  });
});

describe("POST /api/analyze", () => {
  test("returns pitch curve, notes, tempo/key candidates, and chords for a valid WAV", async () => {
    const formData = new FormData();
    formData.append("audio", scaleWavBlob(), "input.wav");

    const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: formData });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.pitchCurve)).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
    expect(body.notes.length).toBe(8);
    expect(Array.isArray(body.tempoCandidates)).toBe(true);
    expect(Array.isArray(body.keyCandidates)).toBe(true);
    expect(body.keyCandidates[0].tonic).toBe("C");
    expect(Array.isArray(body.chords)).toBe(true);
    expect(typeof body.selectedBpm).toBe("number");
  });

  test("422s when no pitch can be detected", async () => {
    const formData = new FormData();
    formData.append("audio", new Blob([encodeWavPcm16(generateSilence(1, 44100), 44100)]), "silence.wav");

    const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: formData });
    expect(response.status).toBe(422);
  });

  test("400s when the 'audio' field is missing", async () => {
    const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: new FormData() });
    expect(response.status).toBe(400);
  });
});

async function analyze() {
  const formData = new FormData();
  formData.append("audio", scaleWavBlob(), "input.wav");
  const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: formData });
  return response.json();
}

function readMidiHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { magic: String.fromCharCode(...bytes.subarray(0, 4)), numTracks: view.getUint16(10, false) };
}

describe("POST /api/export/midi", () => {
  test("returns a valid single-track SMF for plain (non-humanized, chord-less) notes", async () => {
    const { notes } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/midi");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const header = readMidiHeader(bytes);
    expect(header.magic).toBe("MThd");
    expect(header.numTracks).toBe(2); // tempo + melody only
  });

  test("is deterministic for the same humanize/seed", async () => {
    const { notes } = await analyze();
    const requestBody = JSON.stringify({ notes, humanize: 0.7, seed: 7, bpm: 120 });

    const responseA = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });
    const responseB = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    expect(new Uint8Array(await responseA.arrayBuffer())).toEqual(new Uint8Array(await responseB.arrayBuffer()));
  });

  test("arranges piano/bass/drums/guitar when chords are provided", async () => {
    const { notes, chords, selectedBpm } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, chords, bpm: selectedBpm }),
    });

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(readMidiHeader(bytes).numTracks).toBe(6); // tempo + melody + piano + bass + drums + guitar
  });

  test("honors style and songStructure, still producing a valid SMF", async () => {
    const { notes, chords, selectedBpm } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, chords, bpm: selectedBpm, style: "ballad", songStructure: true, humanize: 0.5, seed: 2 }),
    });

    expect(response.status).toBe(200);
    expect(readMidiHeader(new Uint8Array(await response.arrayBuffer())).magic).toBe("MThd");
  });

  test("honors an explicit instrument subset", async () => {
    const { notes, chords, selectedBpm } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, chords, bpm: selectedBpm, instruments: ["drums"] }),
    });

    expect(readMidiHeader(new Uint8Array(await response.arrayBuffer())).numTracks).toBe(3); // tempo + melody + drums
  });

  test("honors a user-edited chord progression", async () => {
    const { notes, chords, selectedBpm } = await analyze();
    const editedChords = chords.map((chord: { startBeat: number; durationBeats: number; confidence: number }) => ({
      ...chord,
      symbol: "Am7",
    }));

    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, chords: editedChords, bpm: selectedBpm, instruments: ["bass"] }),
    });

    expect(response.status).toBe(200);
    expect(readMidiHeader(new Uint8Array(await response.arrayBuffer())).numTracks).toBe(3);
  });

  test("400s when 'notes' is missing or empty", async () => {
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: [] }),
    });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/export/wav", () => {
  test("returns a valid WAV for melody-only export", async () => {
    const { notes } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/wav`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.subarray(8, 12))).toBe("WAVE");
  });

  test("returns a valid WAV for a full arrangement", async () => {
    const { notes, chords, selectedBpm } = await analyze();
    const response = await fetch(`${baseUrl}/api/export/wav`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, chords, bpm: selectedBpm, humanize: 0.5, seed: 3 }),
    });

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("RIFF");
  });

  test("400s when 'notes' is missing or empty", async () => {
    const response = await fetch(`${baseUrl}/api/export/wav`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: [] }),
    });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/plugins", () => {
  test("lists the registered instruments, styles, and renderers", async () => {
    const response = await fetch(`${baseUrl}/api/plugins`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.instruments.map((i: { id: string }) => i.id).sort()).toEqual([
      "bass",
      "cello",
      "drums",
      "guitar",
      "piano",
      "viola",
      "violin",
    ]);
    expect(body.styles.map((s: { id: string }) => s.id).sort()).toEqual(["ballad", "chiptune", "classical", "pop"]);
    expect(body.renderers).toEqual(["builtin-synth"]);
  });
});
