import { parseArgs } from "node:util";
import { startServer } from "@hum2music/web";

const DEFAULT_PORT = 3000;

export async function runServe(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string" },
    },
  });

  const port = values.port !== undefined ? Number(values.port) : DEFAULT_PORT;
  startServer(port);
  console.log(`hum2music UI available at http://localhost:${port}`);
}
