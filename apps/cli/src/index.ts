#!/usr/bin/env bun
import { runAnalyze } from "./commands/analyze.ts";
import { runCompose } from "./commands/compose.ts";
import { runGenerate } from "./commands/generate.ts";
import { runPlugin } from "./commands/plugin.ts";
import { runServe } from "./commands/serve.ts";
import { runTranscribe } from "./commands/transcribe.ts";

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "transcribe":
      await runTranscribe(rest);
      return;
    case "analyze":
      await runAnalyze(rest);
      return;
    case "generate":
      await runGenerate(rest);
      return;
    case "compose":
      await runCompose(rest);
      return;
    case "plugin":
      await runPlugin(rest);
      return;
    case "serve":
      await runServe(rest);
      return;
    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error("Usage: hum2music transcribe <input.wav> -o <output.mid>");
      process.exit(1);
  }
}

main();
