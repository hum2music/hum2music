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

describe("hum2music compose (CLI, routed through the Plugin API)", () => {
  test("writes a 6-track SMF (tempo + melody/piano/bass/drums/guitar) by default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(6);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--instruments violin arranges only the sample violin plugin's track", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "violin"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint16(10, false)).toBe(3); // tempo + melody + violin
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--style ballad runs without error and produces a valid SMF", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--style", "ballad"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("fails with a clear error for an unregistered style id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--style", "classical"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--wav writes a valid WAV file alongside the MIDI", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const midiPath = join(dir, "song.mid");
      const wavPath = join(dir, "song.wav");

      const proc = Bun.spawn(
        ["bun", CLI_ENTRY, "compose", inputPath, "-o", midiPath, "--wav", wavPath, "--seed", "3"],
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

  test("loads plugins from hum2music.config.ts in the current working directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      await Bun.write(
        join(dir, "cello-plugin.ts"),
        `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
export const plugin: Hum2MusicPlugin = {
  id: "@community/instrument-cello",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({ id: "cello", name: "Cello", family: "strings", polyphony: 1 });
    context.arrangers.register({
      id: "@community/instrument-cello/arranger",
      instrumentId: "cello",
      async arrange(ctx) {
        return ctx.chords.map((chord) => ({ pitch: 48, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity: 70 }));
      },
    });
  },
};
export default plugin;
`,
      );
      await Bun.write(
        join(dir, "hum2music.config.ts"),
        `export default { plugins: ["${join(dir, "cello-plugin.ts")}"] };\n`,
      );

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "cello"], {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint16(10, false)).toBe(3); // tempo + melody + cello
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("fails with a clear error when no pitch can be detected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = join(dir, "silence.wav");
      await Bun.write(inputPath, encodeWavPcm16(new Float32Array(44100), 44100));
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});
