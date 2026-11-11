#!/usr/bin/env bun
import { runAnalyze } from "./commands/analyze";
import { runGenerate } from "./commands/generate";
import { runServe } from "./commands/serve";
import { runTranscribe } from "./commands/transcribe";

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
