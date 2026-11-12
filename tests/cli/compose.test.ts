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

/** Scans for a Program Change event on the given MIDI channel (0xC0 + channel) and returns its data byte. Defaults to channel 2 (bass, this file's original use case). */
function findProgramChangeValue(buffer: ArrayBuffer, statusByte = 0xc2): number | undefined {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === statusByte && bytes[i + 1] <= 0x7f) return bytes[i + 1];
  }
  return undefined;
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

  test("--style classical --instruments piano,violin,viola,cello composes a chamber ensemble", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(
        [
          "bun",
          CLI_ENTRY,
          "compose",
          inputPath,
          "-o",
          outputPath,
          "--style",
          "classical",
          "--instruments",
          "piano,violin,viola,cello",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(6); // tempo + melody + piano + violin + viola + cello
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--orchestrate routes the ensemble through assignRoles + the Counterpoint Engine", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(
        [
          "bun",
          CLI_ENTRY,
          "compose",
          inputPath,
          "-o",
          outputPath,
          "--style",
          "classical",
          "--instruments",
          "piano,violin,viola,cello",
          "--orchestrate",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(5); // tempo + piano + violin + viola + cello (no separate melody track: one instrument IS the melody)
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--orchestrate fails with a clear error for an unregistered instrument id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(
        ["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "harp", "--orchestrate"],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(await proc.exited).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--composer motif-development bypasses the Arranger pipeline and produces a Theme+Variations SMF", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(
        ["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--composer", "motif-development"],
        { stdout: "pipe", stderr: "pipe" },
      );
      const stdout = await new Response(proc.stdout).text();
      expect(await proc.exited).toBe(0);
      expect(stdout).toContain("Theme -> Var. 1");

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(readAscii(view, 0, 4)).toBe("MThd");
      expect(view.getUint16(10, false)).toBe(2); // tempo + the composer's single output track
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--composer fails with a clear error for an unregistered composer id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--composer", "unknown"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(1);
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

  test("the bass track's GM program number changes between pop and ballad", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const popPath = join(dir, "pop.mid");
      const balladPath = join(dir, "ballad.mid");

      for (const [style, outputPath] of [
        ["pop", popPath],
        ["ballad", balladPath],
      ] as const) {
        const proc = Bun.spawn(
          ["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "bass", "--style", style],
          { stdout: "pipe", stderr: "pipe" },
        );
        expect(await proc.exited).toBe(0);
      }

      const popBytes = await Bun.file(popPath).arrayBuffer();
      const balladBytes = await Bun.file(balladPath).arrayBuffer();
      expect(findProgramChangeValue(popBytes)).toBe(33);
      expect(findProgramChangeValue(balladBytes)).toBe(32);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("--style chiptune uses the square-lead/synth-bass GM program numbers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(
        ["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "piano,bass", "--style", "chiptune"],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(await proc.exited).toBe(0);

      const bytes = await Bun.file(outputPath).arrayBuffer();
      expect(findProgramChangeValue(bytes, 0xc1)).toBe(80); // piano channel: Lead 1 (square)
      expect(findProgramChangeValue(bytes, 0xc2)).toBe(38); // bass channel: Synth Bass 1
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("fails with a clear error for an unregistered style id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-cli-compose-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--style", "jazz"], {
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
        join(dir, "theremin-plugin.ts"),
        `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
export const plugin: Hum2MusicPlugin = {
  id: "@community/instrument-theremin",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({ id: "theremin", name: "Theremin", family: "electronic", polyphony: 1 });
    context.arrangers.register({
      id: "@community/instrument-theremin/arranger",
      instrumentId: "theremin",
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
        `export default { plugins: ["${join(dir, "theremin-plugin.ts")}"] };\n`,
      );

      const proc = Bun.spawn(["bun", CLI_ENTRY, "compose", inputPath, "-o", outputPath, "--instruments", "theremin"], {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint16(10, false)).toBe(3); // tempo + melody + theremin
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
