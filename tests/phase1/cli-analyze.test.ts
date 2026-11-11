import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { C_MAJOR_SCALE_HZ, encodeWavPcm16, generateScale } from "../../fixtures/synth";

const CLI_ENTRY = join(import.meta.dir, "../../apps/cli/src/index.ts");

describe("hum2music analyze (CLI)", () => {
  test("--json --chords prints tempo/key candidates and a chord per bar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-analyze-"));
    const inputPath = join(dir, "scale.wav");

    try {
      const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
      await Bun.write(inputPath, encodeWavPcm16(samples, 44100));

      const proc = Bun.spawn(["bun", CLI_ENTRY, "analyze", inputPath, "--chords", "--json"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, exitCode] = [await new Response(proc.stdout).text(), await proc.exited];
      expect(exitCode).toBe(0);

      const result = JSON.parse(stdout);
      expect(Array.isArray(result.tempoCandidates)).toBe(true);
      expect(typeof result.selectedBpm).toBe("number");
      expect(Array.isArray(result.keyCandidates)).toBe(true);
      expect(Array.isArray(result.melody)).toBe(true);
      expect(Array.isArray(result.chords)).toBe(true);
      expect(result.chords.length).toBeGreaterThan(0);
      for (const chord of result.chords) {
        expect(typeof chord.symbol).toBe("string");
        expect(typeof chord.confidence).toBe("number");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("human-readable output omits chords without --chords", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-analyze-"));
    const inputPath = join(dir, "scale.wav");

    try {
      const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
      await Bun.write(inputPath, encodeWavPcm16(samples, 44100));

      const proc = Bun.spawn(["bun", CLI_ENTRY, "analyze", inputPath], { stdout: "pipe", stderr: "pipe" });
      const [stdout, exitCode] = [await new Response(proc.stdout).text(), await proc.exited];

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Tempo candidates:");
      expect(stdout).toContain("Key candidates:");
      expect(stdout).not.toContain("Chord progression:");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});
