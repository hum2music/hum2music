import { afterEach, describe, expect, test } from "bun:test";

const CLI_ENTRY = new URL("../../apps/cli/src/index.ts", import.meta.url).pathname;
const PORT = 34567;

let proc: ReturnType<typeof Bun.spawn> | undefined;

afterEach(() => {
  proc?.kill();
  proc = undefined;
});

async function waitForServer(url: string, timeoutMs = 10000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError ?? new Error(`Server at ${url} never became ready`);
}

describe("hum2music serve (CLI)", () => {
  test("starts an HTTP server on the given port that serves the UI", async () => {
    proc = Bun.spawn(["bun", CLI_ENTRY, "serve", "--port", String(PORT)], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const response = await waitForServer(`http://localhost:${PORT}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Hum2Music");
  }, 15000);

  test("defaults to port 3000 when --port is omitted", async () => {
    proc = Bun.spawn(["bun", CLI_ENTRY, "serve"], { stdout: "pipe", stderr: "pipe" });

    const response = await waitForServer("http://localhost:3000/");
    expect(response.status).toBe(200);
  }, 15000);
});
