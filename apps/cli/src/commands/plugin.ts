import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { choraleComposerPlugin } from "@hum2music/composer-chorale";
import { motifDevelopmentComposerPlugin } from "@hum2music/composer-motif-development";
import { bassInstrumentPlugin } from "@hum2music/instrument-bass";
import { celloInstrumentPlugin } from "@hum2music/instrument-cello";
import { drumsInstrumentPlugin } from "@hum2music/instrument-drums";
import { guitarInstrumentPlugin } from "@hum2music/instrument-guitar";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { violaInstrumentPlugin } from "@hum2music/instrument-viola";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import { builtinSynthRendererPlugin } from "@hum2music/renderer-builtin-synth";
import { soundFontRendererPlugin } from "@hum2music/renderer-soundfont";
import { createHum2Music } from "@hum2music/sdk";
import { chiptuneStylePlugin } from "@hum2music/style-chiptune";
import { pianoSoloStylePlugin } from "@hum2music/style-piano-solo";
import { classicalStylePlugin } from "@hum2music/style-classical";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";
import { validateInstrument } from "@hum2music/testing";
import { writeFileData } from "../fs-compat.ts";
import { loadPluginModule } from "../plugin-loader.ts";

const USAGE = [
  "Usage: hum2music plugin <subcommand>",
  "",
  "List, validate, scaffold, and test Hum2Music plugins.",
  "",
  "Subcommands:",
  "  list                                List the registered built-in plugins",
  "  validate <path-to-plugin-module>    Load a plugin module and check it registers cleanly",
  "  create <name> [--dir <output-dir>]  Scaffold a new plugin's package.json/tsconfig.json/src/index.ts",
  "  test <path-to-plugin-dir>           Run the plugin's own `bun test` suite (requires Bun)",
  "",
  "Run `hum2music plugin <subcommand> --help` for details on a specific subcommand.",
].join("\n");

/** PRD UPDATE_PRD.md §10.2's "プラグイン作成ツール" CLI commands. */
export async function runPlugin(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;

  switch (subcommand) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return;
    case "list":
      await runList();
      return;
    case "validate":
      await runValidate(rest);
      return;
    case "create":
      await runCreate(rest);
      return;
    case "test":
      await runTest(rest);
      return;
    default:
      console.error(`Unknown "plugin" subcommand: "${subcommand}"\n`);
      console.error(USAGE);
      process.exit(1);
  }
}

async function registerBuiltins(): Promise<ReturnType<typeof createHum2Music>> {
  const app = createHum2Music();
  await app.use(pianoInstrumentPlugin);
  await app.use(violinInstrumentPlugin);
  await app.use(violaInstrumentPlugin);
  await app.use(celloInstrumentPlugin);
  await app.use(bassInstrumentPlugin);
  await app.use(drumsInstrumentPlugin);
  await app.use(guitarInstrumentPlugin);
  await app.use(popBalladStylePlugin);
  await app.use(classicalStylePlugin);
  await app.use(chiptuneStylePlugin);
  await app.use(pianoSoloStylePlugin);
  await app.use(builtinSynthRendererPlugin);
  await app.use(soundFontRendererPlugin);
  await app.use(motifDevelopmentComposerPlugin);
  await app.use(choraleComposerPlugin);
  return app;
}

async function runList(): Promise<void> {
  const app = await registerBuiltins();
  for (const plugin of app.listPlugins()) {
    console.log(`${plugin.id} (v${plugin.version}, apiVersion ${plugin.apiVersion})`);
  }
  await app.dispose();
}

const VALIDATE_HELP =
  "Usage: hum2music plugin validate <path-to-plugin-module>\n\n" +
  "Load a plugin module, register it against a fresh host, and report whether it\n" +
  "registers cleanly (id/apiVersion/instrument validation).";

async function runValidate(args: string[]): Promise<void> {
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(VALIDATE_HELP);
    return;
  }

  const modulePath = args[0];
  if (!modulePath) {
    console.error(VALIDATE_HELP);
    process.exit(1);
  }

  const app = createHum2Music();
  let candidate: Awaited<ReturnType<typeof loadPluginModule>>;
  try {
    candidate = await loadPluginModule(resolve(modulePath));
    await app.use(candidate);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const instrumentErrors = app
    .listInstruments()
    .flatMap((instrument) => validateInstrument(instrument).map((message) => `  - ${instrument.id}: ${message}`));

  if (instrumentErrors.length > 0) {
    console.error(`Plugin "${candidate.id}" registered, but its instrument(s) failed validation:`);
    console.error(instrumentErrors.join("\n"));
    process.exit(1);
  }

  console.log(`Plugin "${candidate.id}" (v${candidate.version}, apiVersion ${candidate.apiVersion}) registered successfully.`);
  console.log(`  Instruments: ${app.listInstruments().map((i) => i.id).join(", ") || "(none)"}`);
  console.log(`  Styles: ${app.listStyles().map((s) => s.id).join(", ") || "(none)"}`);
  console.log(`  Renderers: ${app.listRenderers().map((r) => r.id).join(", ") || "(none)"}`);
  await app.dispose();
}

const CREATE_HELP = `Usage: hum2music plugin create <name> [--dir <output-dir>]

Scaffold a new plugin's package.json, tsconfig.json, and src/index.ts.

Options:
      --dir <dir>  Parent directory to create the plugin in (default: current directory)
  -h, --help       Show this help message`;

async function runCreate(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: { dir: { type: "string" }, help: { type: "boolean", short: "h", default: false } },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(CREATE_HELP);
    return;
  }

  const name = positionals[0];
  if (!name) {
    console.error(CREATE_HELP);
    process.exit(1);
  }

  const targetDir = resolve(values.dir ?? ".", name);
  await mkdir(join(targetDir, "src"), { recursive: true });

  await writeFileData(
    join(targetDir, "package.json"),
    `${JSON.stringify(
      {
        name,
        version: "0.1.0",
        private: true,
        type: "module",
        main: "./src/index.ts",
        types: "./src/index.ts",
        dependencies: { "@hum2music/plugin-api": "latest" },
      },
      null,
      2,
    )}\n`,
  );

  await writeFileData(
    join(targetDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          types: ["@types/bun"],
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  await writeFileData(
    join(targetDir, "src/index.ts"),
    `import type { Hum2MusicPlugin } from "@hum2music/plugin-api";

export const plugin: Hum2MusicPlugin = {
  id: "${name}",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    // context.instruments.register({ id: "...", name: "...", family: "...", polyphony: 1 });
    // context.arrangers.register({ id: "...", instrumentId: "...", async arrange(arrangementContext) { ... } });
  },
};

export default plugin;
`,
  );

  console.log(`Scaffolded a new plugin at ${targetDir}`);
}

const TEST_HELP =
  "Usage: hum2music plugin test <path-to-plugin-dir>\n\n" +
  "Run the plugin's own `bun test` suite (requires Bun; there is no Node equivalent).";

/** Spawns `bun test` in the plugin's directory - inherently Bun-specific, since it runs Bun's own test runner (not a Node equivalent). */
async function runTest(args: string[]): Promise<void> {
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(TEST_HELP);
    return;
  }

  const targetDir = args[0];
  if (!targetDir) {
    console.error(TEST_HELP);
    process.exit(1);
  }

  if (typeof Bun === "undefined") {
    console.error('"hum2music plugin test" requires Bun (it runs the plugin\'s own `bun test` suite).');
    process.exit(1);
  }

  const proc = Bun.spawn(["bun", "test"], { cwd: resolve(targetDir), stdout: "inherit", stderr: "inherit" });
  process.exit(await proc.exited);
}
