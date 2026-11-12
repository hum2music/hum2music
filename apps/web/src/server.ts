import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAnalyze } from "./api/analyze.ts";
import { handleExportMidi } from "./api/export-midi.ts";
import { handleExportWav } from "./api/export-wav.ts";
import { handlePlugins } from "./api/plugins.ts";

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public");

type BunServeResult = ReturnType<typeof Bun.serve>;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
};

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/analyze") {
    return handleAnalyze(request);
  }
  if (request.method === "POST" && url.pathname === "/api/export/midi") {
    return handleExportMidi(request);
  }
  if (request.method === "POST" && url.pathname === "/api/export/wav") {
    return handleExportWav(request);
  }
  if (request.method === "GET" && url.pathname === "/api/plugins") {
    return handlePlugins();
  }

  return serveStatic(url.pathname);
}

/**
 * Bun.serve() when running under Bun (the primary, tested runtime), with a
 * plain node:http server as a fallback so the same source also runs under
 * Node.js. The Node branch is cast to Bun.serve()'s return type since
 * nothing in this codebase relies on Bun-specific members (.port/.stop())
 * of a server started under Node.
 */
export function startServer(port: number): BunServeResult {
  if (typeof Bun !== "undefined") {
    return Bun.serve({ port, fetch: handleRequest });
  }
  return startNodeServer(port) as unknown as BunServeResult;
}

function startNodeServer(port: number): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    handleNodeRequest(req, res).catch((error: unknown) => {
      res.statusCode = 500;
      res.end(String((error as Error)?.message ?? error));
    });
  });
  server.listen(port);
  return server;
}

async function handleNodeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleRequest(await toWebRequest(req));

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await bufferStream(req);

  return new Request(url.toString(), { method, headers, body });
}

async function bufferStream(stream: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function serveStatic(pathname: string): Promise<Response> {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(PUBLIC_DIR, "." + relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (typeof Bun !== "undefined") {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  }

  try {
    const data = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath)];
    return new Response(data, { headers: contentType ? { "content-type": contentType } : {} });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
