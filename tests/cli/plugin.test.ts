import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI_ENTRY = join(import.meta.dir, "../../apps/cli/src/index.ts");

function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", CLI_ENTRY, ...args], { stdout: "pipe", stderr: "pipe" });
  return (async () => ({
    exitCode: await proc.exited,
    stdout: await new Response(proc.stdout).text(),
    stderr: await new Response(proc.stderr).text(),
  }))();
}

describe("hum2music plugin list", () => {
  test("lists every built-in plugin", async () => {
    const { exitCode, stdout } = await runCli(["plugin", "list"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("@hum2music/instrument-piano");
    expect(stdout).toContain("@hum2music/instrument-violin");
    expect(stdout).toContain("@hum2music/style-pop-ballad");
    expect(stdout).toContain("@hum2music/renderer-builtin-synth");
    expect(stdout).toContain("@hum2music/composer-motif-development");
  });
});

describe("hum2music plugin create / validate", () => {
  test("scaffolds a plugin that then passes validate", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-plugin-"));
    try {
      const created = await runCli(["plugin", "create", "my-plugin", "--dir", dir]);
      expect(created.exitCode).toBe(0);

      const modulePath = join(dir, "my-plugin", "src", "index.ts");
      await writeFile(
        modulePath,
        `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
export const plugin: Hum2MusicPlugin = {
  id: "my-plugin",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({ id: "cello", name: "Cello", family: "strings", polyphony: 1 });
  },
};
export default plugin;
`,
      );

      const validated = await runCli(["plugin", "validate", modulePath]);
      expect(validated.exitCode).toBe(0);
      expect(validated.stdout).toContain('Plugin "my-plugin"');
      expect(validated.stdout).toContain("cello");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("validate fails with a clear error for an instrument that violates its own constraints", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-plugin-"));
    try {
      const modulePath = join(dir, "broken.ts");
      await writeFile(
        modulePath,
        `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
export default {
  id: "broken-plugin",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.instruments.register({ id: "x", name: "", family: "other", polyphony: 0 });
  },
} satisfies Hum2MusicPlugin;
`,
      );

      const { exitCode, stderr } = await runCli(["plugin", "validate", modulePath]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("failed validation");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("validate fails with a clear error for an incompatible apiVersion", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-plugin-"));
    try {
      const modulePath = join(dir, "incompatible.ts");
      await writeFile(
        modulePath,
        `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
export default {
  id: "incompatible-plugin",
  version: "0.1.0",
  apiVersion: "2.0.0",
  register() {},
} satisfies Hum2MusicPlugin;
`,
      );

      const { exitCode, stderr } = await runCli(["plugin", "validate", modulePath]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("incompatible");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("validate fails clearly when the module has no plugin-shaped export", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-plugin-"));
    try {
      const modulePath = join(dir, "not-a-plugin.ts");
      await writeFile(modulePath, "export const notAPlugin = 42;\n");

      const { exitCode, stderr } = await runCli(["plugin", "validate", modulePath]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("No Hum2MusicPlugin-shaped export found");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});

describe("hum2music plugin test", () => {
  test("runs bun test inside the given plugin directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hum2music-plugin-"));
    try {
      await writeFile(
        join(dir, "sample.test.ts"),
        'import { expect, test } from "bun:test";\ntest("sanity", () => expect(1 + 1).toBe(2));\n',
      );

      const { exitCode, stdout, stderr } = await runCli(["plugin", "test", dir]);
      expect(exitCode).toBe(0);
      expect(stdout + stderr).toContain("1 pass");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 20000);
});
