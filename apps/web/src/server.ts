import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAnalyze } from "./api/analyze";
import { handleExportMidi } from "./api/export-midi";
import { handleExportWav } from "./api/export-wav";
import { handlePlugins } from "./api/plugins";

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public");

export function startServer(port: number): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port,
    async fetch(request) {
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
    },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(PUBLIC_DIR, "." + relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file);
}
