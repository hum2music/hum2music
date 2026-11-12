import { parseArgs } from "node:util";
import { startServer } from "@hum2music/web";

const DEFAULT_PORT = 3000;

const HELP = `Usage: hum2music serve [options]

Start the localhost web UI (upload a WAV, review the analysis, export MIDI/WAV).

Options:
      --port <number>  Port to listen on (default: ${DEFAULT_PORT})
  -h, --help           Show this help message

Example:
  hum2music serve --port 8080`;

export async function runServe(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const port = values.port !== undefined ? Number(values.port) : DEFAULT_PORT;
  startServer(port);
  console.log(`hum2music UI available at http://localhost:${port}`);
}
