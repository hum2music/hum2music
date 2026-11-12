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

/**
 * Regression coverage for the apps/cli Node.js compatibility work: the CLI
 * source (fs-compat.ts's Bun.file/Bun.write fallback to node:fs/promises)
 * must keep running under plain `node`, not just `bun`. `hum2music plugin
 * test` is intentionally excluded - it spawns Bun's own test runner, which
 * has no Node equivalent.
 */
describe("hum2music CLI under plain Node.js (not Bun)", () => {
  test("transcribe produces a valid SMF", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-node-compat-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const outputPath = join(dir, "song.mid");

      const proc = Bun.spawn(["node", CLI_ENTRY, "transcribe", inputPath, "-o", outputPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const stderr = await new Response(proc.stderr).text();
      expect(await proc.exited, stderr).toBe(0);

      const bytes = new Uint8Array(await Bun.file(outputPath).arrayBuffer());
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("MThd");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("compose --style classical --instruments piano,violin,viola,cello --orchestrate --composer produce valid output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-node-compat-"));
    try {
      const inputPath = await writeScaleFixture(dir);
      const orchestratedPath = join(dir, "orchestrated.mid");
      const composerPath = join(dir, "composer.mid");

      const orchestrated = Bun.spawn(
        [
          "node",
          CLI_ENTRY,
          "compose",
          inputPath,
          "-o",
          orchestratedPath,
          "--style",
          "classical",
          "--instruments",
          "piano,violin,viola,cello",
          "--orchestrate",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      const orchestratedStderr = await new Response(orchestrated.stderr).text();
      expect(await orchestrated.exited, orchestratedStderr).toBe(0);
      expect(String.fromCharCode(...new Uint8Array(await Bun.file(orchestratedPath).arrayBuffer()).slice(0, 4))).toBe(
        "MThd",
      );

      const composer = Bun.spawn(
        ["node", CLI_ENTRY, "compose", inputPath, "-o", composerPath, "--composer", "motif-development"],
        { stdout: "pipe", stderr: "pipe" },
      );
      const composerStderr = await new Response(composer.stderr).text();
      expect(await composer.exited, composerStderr).toBe(0);
      expect(String.fromCharCode(...new Uint8Array(await Bun.file(composerPath).arrayBuffer()).slice(0, 4))).toBe(
        "MThd",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("plugin list and plugin create work", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-node-compat-"));
    try {
      const list = Bun.spawn(["node", CLI_ENTRY, "plugin", "list"], { stdout: "pipe", stderr: "pipe" });
      const listStdout = await new Response(list.stdout).text();
      expect(await list.exited).toBe(0);
      expect(listStdout).toContain("@hum2music/instrument-piano");

      const create = Bun.spawn(["node", CLI_ENTRY, "plugin", "create", "my-plugin", "--dir", dir], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await create.exited).toBe(0);
      expect(await Bun.file(join(dir, "my-plugin", "package.json")).exists()).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("plugin test fails clearly under Node (it requires Bun)", async () => {
    const proc = Bun.spawn(["node", CLI_ENTRY, "plugin", "test", "."], { stdout: "pipe", stderr: "pipe" });
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited).toBe(1);
    expect(stderr).toContain("requires Bun");
  });
});
