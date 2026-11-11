import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { C_MAJOR_SCALE_HZ, encodeWavPcm16, generateScale } from "../../fixtures/synth";

const CLI_ENTRY = join(import.meta.dir, "../../apps/cli/src/index.ts");

async function writeScaleFixture(dir: string): Promise<string> {
  const inputPath = join(dir, "scale.wav");
  const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
  await Bun.write(inputPath, encodeWavPcm16(samples, 44100));
  return inputPath;
}

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

describe("hum2music generate (CLI)", () => {
  test("writes a 5-track SMF (tempo + melody/piano/bass/drums) by default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-generate-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "generate", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(5);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--instruments filters which tracks are included", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-generate-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "generate", inputPath, "-o", outputPath, "--instruments", "bass"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint16(10, false)).toBe(3); // tempo + melody + bass
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--wav writes a valid WAV file alongside the MIDI", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-generate-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const midiPath = join(dir, "song.mid");
      const wavPath = join(dir, "song.wav");

      const proc = Bun.spawn(
        ["bun", CLI_ENTRY, "generate", inputPath, "-o", midiPath, "--wav", wavPath, "--humanize", "0.5", "--seed", "3"],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(await proc.exited).toBe(0);

      const wavBytes = new Uint8Array(await Bun.file(wavPath).arrayBuffer());
      const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("RIFF");
      expect(readAscii(view, 8, 4)).toBe("WAVE");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("fails with a clear error when no pitch can be detected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-generate-"));
    try {
      const inputPath = join(dir, "silence.wav");
      await Bun.write(inputPath, encodeWavPcm16(new Float32Array(44100), 44100));
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "generate", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});
