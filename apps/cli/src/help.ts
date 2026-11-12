export interface CommandSummary {
  name: string;
  summary: string;
}

export const COMMANDS: CommandSummary[] = [
  { name: "transcribe", summary: "Transcribe a hummed WAV recording to a single-track MIDI melody." },
  { name: "analyze", summary: "Print tempo/key/chord analysis for a hummed WAV recording." },
  { name: "generate", summary: "Arrange a hummed WAV into a multi-track MIDI/WAV song (fixed instrument set)." },
  { name: "compose", summary: "Same as generate, but through the Plugin API (instruments/styles/composers/renderers are pluggable)." },
  { name: "plugin", summary: "List, validate, scaffold, and test Hum2Music plugins." },
  { name: "serve", summary: "Start the localhost web UI." },
];

export function printTopLevelHelp(): void {
  console.log("hum2music - turn a hummed melody into a multi-track MIDI/WAV song (no generative AI, rule-based).");
  console.log("");
  console.log("Usage: hum2music <command> [options]");
  console.log("");
  console.log("Commands:");
  for (const command of COMMANDS) {
    console.log(`  ${command.name.padEnd(12)} ${command.summary}`);
  }
  console.log("");
  console.log("Run `hum2music <command> --help` for details and options on a specific command.");
}
