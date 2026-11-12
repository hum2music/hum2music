import { describe, expect, test } from "bun:test";
import { C_MAJOR_SCALE_HZ, encodeWavPcm16, generateScale } from "../../fixtures/synth";

/**
 * Regression coverage for apps/web's Node.js compatibility: startServer()'s
 * node:http fallback (used when Bun.serve isn't available) must keep
 * serving real requests under plain `node`, not just Bun. Runs the actual
 * server in-process via a dynamically imported, pre-stripped-free .ts
 * import - this test file itself still runs under `bun test`, but it
 * spawns a separate `node` process that imports @hum2music/web directly,
 * so the HTTP adapter is genuinely exercised outside Bun.
 */
describe("@hum2music/web's startServer under plain Node.js (not Bun)", () => {
  test("serves static files, /api/plugins, and the analyze/export endpoints", async () => {
    const port = 8940 + Math.floor(Math.random() * 1000);
    const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
    const wavBase64 = Buffer.from(encodeWavPcm16(samples, 44100)).toString("base64");

    const script = `
      const { startServer } = await import("@hum2music/web");
      const server = startServer(${port});
      await new Promise((r) => setTimeout(r, 200));

      const results = {};

      const indexRes = await fetch("http://localhost:${port}/");
      results.index = { status: indexRes.status, hasTitle: (await indexRes.text()).includes("Hum2Music") };

      const notFoundRes = await fetch("http://localhost:${port}/does-not-exist");
      results.notFound = { status: notFoundRes.status };

      const pluginsRes = await fetch("http://localhost:${port}/api/plugins");
      const pluginsBody = await pluginsRes.json();
      results.plugins = { status: pluginsRes.status, instrumentCount: pluginsBody.instruments.length };

      const wavBuffer = Buffer.from("${wavBase64}", "base64");
      const form = new FormData();
      form.append("audio", new Blob([wavBuffer], { type: "audio/wav" }), "input.wav");
      const analyzeRes = await fetch("http://localhost:${port}/api/analyze", { method: "POST", body: form });
      const analyzeBody = await analyzeRes.json();
      results.analyze = { status: analyzeRes.status, noteCount: analyzeBody.notes.length };

      const midiRes = await fetch("http://localhost:${port}/api/export/midi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: analyzeBody.notes, chords: analyzeBody.chords, bpm: analyzeBody.selectedBpm }),
      });
      const midiBytes = new Uint8Array(await midiRes.arrayBuffer());
      results.exportMidi = { status: midiRes.status, header: String.fromCharCode(...midiBytes.slice(0, 4)) };

      server.close();
      console.log(JSON.stringify(results));
    `;

    const proc = Bun.spawn(["node", "--input-type=module", "-e", script], { stdout: "pipe", stderr: "pipe" });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited, stderr).toBe(0);

    const results = JSON.parse(stdout.trim().split("\n").pop()!);
    expect(results.index).toEqual({ status: 200, hasTitle: true });
    expect(results.notFound).toEqual({ status: 404 });
    expect(results.plugins.status).toBe(200);
    expect(results.plugins.instrumentCount).toBeGreaterThan(0);
    expect(results.analyze.status).toBe(200);
    expect(results.analyze.noteCount).toBeGreaterThan(0);
    expect(results.exportMidi).toEqual({ status: 200, header: "MThd" });
  }, 20000);
});
