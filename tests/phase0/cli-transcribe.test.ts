import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { C_MAJOR_SCALE_HZ, encodeWavPcm16, generateScale } from "../../fixtures/synth";

const CLI_ENTRY = join(import.meta.dir, "../../apps/cli/src/index.ts");

describe("hum2music transcribe (CLI)", () => {
  test("writes a valid multi-note SMF from a WAV fixture", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-"));
    const inputPath = join(dir, "scale.wav");
    const outputPath = join(dir, "melody.mid");

    try {
      const samples = generateScale(C_MAJOR_SCALE_HZ, 0.3, 0.08, 44100);
      await Bun.write(inputPath, encodeWavPcm16(samples, 44100));

      const proc = Bun.spawn(["bun", CLI_ENTRY, "transcribe", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);

      const midiBytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(midiBytes.buffer, midiBytes.byteOffset, midiBytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("fails with a clear error when no pitch can be detected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-"));
    const inputPath = join(dir, "silence.wav");
    const outputPath = join(dir, "melody.mid");

    try {
      const silentSamples = new Float32Array(44100);
      await Bun.write(inputPath, encodeWavPcm16(silentSamples, 44100));

      const proc = Bun.spawn(["bun", CLI_ENTRY, "transcribe", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}
