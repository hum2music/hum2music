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

describe("POST /api/export/midi", () => {
  async function analyzeNotes() {
    const formData = new FormData();
    formData.append("audio", scaleWavBlob(), "input.wav");
    const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: formData });
    return (await response.json()).notes;
  }

  test("returns a valid SMF for plain (non-humanized) notes", async () => {
    const notes = await analyzeNotes();
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/midi");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("MThd");
  });

  test("is deterministic for the same humanize/seed", async () => {
    const notes = await analyzeNotes();
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

  test("400s when 'notes' is missing or empty", async () => {
    const response = await fetch(`${baseUrl}/api/export/midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: [] }),
    });
    expect(response.status).toBe(400);
  });
});
